#
# Modified version of webapp2
# http://code.google.com/p/webapp-improved/source/browse/webapp2.py
# 
# :copyright: 2011 by tipfy.org.
# :license: Apache Sotware License, see LICENSE for details.
#

import urllib
import urlparse
import re

#: Regex for URL definitions.
_ROUTE_REGEX = re.compile(r'''
    \<            # The exact character "<"
    (\w*)         # The optional variable name (restricted to a-z, 0-9, _)
    (?::([^>]*))? # The optional :regex part
    \>            # The exact character ">"
    ''', re.VERBOSE)


class BaseRoute(object):
    """Interface for URL routes. Custom routes must implement some or all
    methods and attributes from this class.
    """
    #: Route name, used to build URLs.
    name = None
    #: True if this route is only used for URL generation and never matches.
    build_only = False

    def match(self, request):
        """Matches this route against the current request.

        :param request:
            A ``webob.Request`` instance.
        :returns:
            A tuple ``(handler, args, kwargs)`` if the route matches, or None.
        """
        raise NotImplementedError()

    def build(self, request, args, kwargs):
        """Builds and returns a URL for this route.

        :param request:
            The current ``Request`` object.
        :param args:
            Tuple of positional arguments to build the URL.
        :param kwargs:
            Dictionary of keyword arguments to build the URL.
        :returns:
            An absolute or relative URL.
        """
        raise NotImplementedError()

    def get_routes(self):
        """Generator to get all routes from a route.

        :yields:
            This route or all nested routes that it contains.
        """
        yield self

    def get_match_routes(self):
        """Generator to get all routes that can be matched from a route.

        :yields:
            This route or all nested routes that can be matched.
        """
        if not self.build_only:
            yield self
        elif not self.name:
            raise ValueError("Route %r is build_only but doesn't have a "
                "name" % self)

    def get_build_routes(self):
        """Generator to get all routes that can be built from a route.

        :yields:
            This route or all nested routes that can be built.
        """
        if self.name is not None:
            yield self


class Route(BaseRoute):
    """A URL route definition. A route template contains parts enclosed by
    ``<>`` and is used to match requested URLs. Here are some examples::

        route = Route(r'/article/<id:[\d]+>', ArticleHandler)
        route = Route(r'/wiki/<page_name:\w+>', WikiPageHandler)
        route = Route(r'/blog/<year:\d{4}>/<month:\d{2}>/<day:\d{2}>/<slug:\w+>', BlogItemHandler)

    Based on `Another Do-It-Yourself Framework`_, by Ian Bicking. We added
    URL building, non-keyword variables and other improvements.
    """
    def __init__(self, template, handler=None, name=None, defaults=None,
        build_only=False):
        """Initializes a URL route.

        :param template:
            A route template to be matched, containing parts enclosed by ``<>``
            that can have only a name, only a regular expression or both:

              =============================  ==================================
              Format                         Example
              =============================  ==================================
              ``<name>``                     ``r'/<year>/<month>'``
              ``<:regular expression>``      ``r'/<:\d{4}>/<:\d{2}>'``
              ``<name:regular expression>``  ``r'/<year:\d{4}>/<month:\d{2}>'``
              =============================  ==================================

            If the name is set, the value of the matched regular expression
            is passed as keyword argument to the :class:`RequestHandler`.
            Otherwise it is passed as positional argument.

            The same template can mix parts with name, regular expression or
            both.
        :param handler:
            A :class:`RequestHandler` class or dotted name for a class to be
            lazily imported, e.g., ``my.module.MyHandler``.
        :param name:
            The name of this route, used to build URLs based on it.
        :param defaults:
            Default or extra keywords to be returned by this route. Values
            also present in the route variables are used to build the URL
            when they are missing.
        :param build_only:
            If True, this route never matches and is used only to build URLs.
        """
        self.template = template
        self.handler = handler
        self.name = name
        self.defaults = defaults or {}
        self.build_only = build_only
        # Lazy properties.
        self.regex = None
        self.variables = None
        self.reverse_template = None

    def _parse_template(self):
        self.variables = {}
        last = count = 0
        regex = template = ''
        for match in _ROUTE_REGEX.finditer(self.template):
            part = self.template[last:match.start()]
            name = match.group(1)
            expr = match.group(2) or '[^/]+'
            last = match.end()

            if not name:
                name = '__%d__' % count
                count += 1

            template += '%s%%(%s)s' % (part, name)
            regex += '%s(?P<%s>%s)' % (re.escape(part), name, expr)
            self.variables[name] = re.compile('^%s$' % expr)

        regex = '^%s%s$' % (regex, re.escape(self.template[last:]))
        self.regex = re.compile(regex)
        self.reverse_template = template + self.template[last:]
        self.has_positional_variables = count > 0

    def _regex(self):
        if self.regex is None:
            self._parse_template()

        return self.regex

    def _variables(self):
        if self.variables is None:
            self._parse_template()

        return self.variables

    def _reverse_template(self):
        if self.reverse_template is None:
            self._parse_template()

        return self.reverse_template

    def match(self, request):
        """Matches this route against the current request.

        .. seealso:: :meth:`BaseRoute.match`.
        """
        regex = self.regex or self._regex()
        path = request if isinstance(request, str) else request.path
        match = regex.match(path)
        if match:
            kwargs = self.defaults.copy()
            kwargs.update(match.groupdict())
            if kwargs and self.has_positional_variables:
                args = tuple(value[1] for value in sorted((int(key[2:-2]), \
                    kwargs.pop(key)) for key in \
                    kwargs.keys() if key.startswith('__')))
            else:
                args = ()

            return self.handler, args, kwargs

    def build(self, request, args, kwargs):
        """Builds a URL for this route.

        .. seealso:: :meth:`Router.build`.
        """
        return self._build(request, args, kwargs)[0]

    def _build(self, request, args, kwargs):
        full = kwargs.pop('_full', False)
        scheme = kwargs.pop('_scheme', None)
        netloc = kwargs.pop('_netloc', None)
        anchor = kwargs.pop('_anchor', None)

        if full or scheme or netloc:
            if not netloc:
                netloc = request.host

            if not scheme:
                scheme = 'http'

        path, query = self._build_path(args, kwargs.copy())
        return urlunsplit(scheme, netloc, path, query, anchor), query

    def _build_path(self, args, kwargs):
        """Builds the path for this route.

        :returns:
            A tuple ``(path, query)`` with the built URL path and extra
            keywords to be used as URL query arguments.
        """
        variables = self.variables or self._variables()
        if self.has_positional_variables:
            for index, value in enumerate(args):
                key = '__%d__' % index
                if key in variables:
                    kwargs[key] = value

        values = {}
        for name, regex in variables.iteritems():
            value = kwargs.pop(name, self.defaults.get(name))
            if not value:
                raise KeyError('Missing argument "%s" to build URL.' % \
                    name.strip('_'))

            if not isinstance(value, basestring):
                value = str(value)

            if not regex.match(value):
                raise ValueError('URL buiding error: Value "%s" is not '
                    'supported for argument "%s".' % (value, name.strip('_')))

            values[name] = value

        return (self.reverse_template % values, kwargs)


class Router(object):
    """A simple URL router used to match the current URL, dispatch the handler
    and build URLs for other resources.
    """
    #: Class used when the route is a tuple.
    route_class = Route

    def __init__(self, routes=None):
        """Initializes the router.

        :param routes:
            A list of :class:`Route` instances to initialize the router.
        """
        # All routes that can be matched.
        self.match_routes = []
        # All routes that can be built.
        self.build_routes = {}
        if routes:
            for route in routes:
                self.add(route)

    def add(self, route):
        """Adds a route to this router.

        :param route:
            A :class:`Route` instance.
        """
        if isinstance(route, tuple):
            # Default route.
            route = self.route_class(*route)

        for r in route.get_match_routes():
            self.match_routes.append(r)

        for r in route.get_build_routes():
            self.build_routes.setdefault(r.name, []).append(r)

    def match(self, request):
        """Matches all routes against the current request. The first one that
        matches is returned.

        :param request:
            A ``webob.Request`` instance.
        :returns:
            A tuple ``(route, args, kwargs)`` if a route matched, or None.
        """
        for route in self.match_routes:
            match = route.match(request)
            if match:
                return match

    def build(self, name, request, args, kwargs):
        """Builds and returns a URL for a named :class:`Route`.

        :param name:
            The route name.
        :param request:
            The current ``Request`` object.
        :param args:
            Tuple of positional arguments to build the URL.
        :param kwargs:
            Dictionary of keyword arguments to build the URL.
        :returns:
            An absolute or relative URL.
        """
        routes = self.build_routes.get(name)
        if not routes:
            raise KeyError('Route %r is not defined.' % name)

        best_match = None
        for route in routes:
            try:
                url, query = route._build(request, args, kwargs)
                query_count = len(query)
                if query_count == 0:
                    return url

                if best_match is None or query_count < best_match[0]:
                    best_match = (query_count, url)
            except (KeyError, ValueError), e:
                pass

        if best_match:
            return best_match[1]

        raise ValueError('No routes are suitable to build %r with '
            'arguments %r and keyword arguments %r.' % (name, args, kwargs))


def to_utf8(value):
    """Returns a string encoded using UTF-8.

    This function comes from `Tornado`_.

    :param value:
        A unicode or string to be encoded.
    :returns:
        The encoded string.
    """
    if isinstance(value, unicode):
        return value.encode('utf-8')

    assert isinstance(value, str)
    return value


def to_unicode(value):
    """Returns a unicode string from a string, using UTF-8 to decode if needed.

    This function comes from `Tornado`_.

    :param value:
        A unicode or string to be decoded.
    :returns:
        The decoded string.
    """
    if isinstance(value, str):
        return value.decode('utf-8')

    assert isinstance(value, unicode)
    return value


def urlunsplit(scheme=None, netloc=None, path=None, query=None, fragment=None):
    """Similar to ``urlparse.urlunsplit``, but will escape values and
    urlencode and sort query arguments.

    :param scheme:
        URL scheme, e.g., `http` or `https`.
    :param netloc:
        Network location, e.g., `localhost:8080` or `www.google.com`.
    :param path:
        URL path.
    :param query:
        URL query as an escaped string, or a dictionary or list of key-values
        tuples to build a query.
    :param fragment:
        Fragment identifier, also known as "anchor".
    :returns:
        An assembled absolute or relative URL.
    """
    if not scheme or not netloc:
        scheme = None
        netloc = None

    if path:
        path = urllib.quote_plus(to_utf8(path), '/')

    if query and not isinstance(query, basestring):
        if isinstance(query, dict):
            query = query.items()

        query_args = []
        for key, values in query:
            if isinstance(values, basestring):
                values = (values,)

            for value in values:
                query_args.append((to_utf8(key), to_utf8(value)))

        # Sorting should be optional? Sorted args are commonly needed to build
        # URL signatures for services.
        query_args.sort()
        query = urllib.urlencode(query_args)

    if fragment:
        fragment = urllib.quote_plus(to_utf8(fragment))

    return urlparse.urlunsplit((scheme, netloc, path, query, fragment))

