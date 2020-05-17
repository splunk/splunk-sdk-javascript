export = Splunk;
declare var Splunk: {
    /**
     * Returns the namespace specified and creates it if it doesn't exist
     * <pre>
     * Splunk.namespace("property.package");
     * Splunk.namespace("Splunk.property.package");
     * </pre>
     * Either of the above would create Splunk.property, then
     * Splunk.property.package
     *
     * @method namespace
     * @static
     * @param  {String} name A "." delimited namespace to create
     * @return {Object} A reference to the last namespace object created
     */
    namespace(name: string): any;
};
