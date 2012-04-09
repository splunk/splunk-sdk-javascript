def normalize_boolean(input, strict_mode=False, include_integers=True):
    '''
    Tries to convert a value to Boolean.  Accepts the following pairs:
    true/false t/f/ 0/1 yes/no on/off y/n
    
    If given a dictionary, this function will attempt to iterate over
    the dictionary and normalize each item.
    
    If strict_mode is True, then a ValueError will be raised if the input
    value is not a recognized boolean.
    
    If strict_mode is False (default), then the input will be returned
    unchanged if it is not recognized as a boolean.  Thus, they will have the
    truth value of the python language.
    
    NOTE: Use this method judiciously, as you may be casting integer values
    into boolean when you don't want to.  If you do want to get integer values,
    the idiom for that is:
    
        try:
            v = int(v)
        except ValueError:
            v = splunk.util.normalizeBoolean(v)
            
    This casts integer-like values into 'int', and others into boolean.
    '''
    
    trueThings = ['true', 't', 'on', 'yes', 'y']
    falseThings = ['false', 'f', 'off', 'no', 'n']

    if include_integers:
        trueThings.append('1')
        falseThings.append('0')
        
    def norm(input):
        if input == True:
            return True
        if input == False:
            return False
        
        try:
            test = input.strip().lower()
        except:
            return input

        if test in trueThings:
            return True
        elif test in falseThings:
            return False
        elif strict_mode:
            raise ValueError('Unable to cast value to boolean: %s' % input)
        else:
            return input
                        
    if isinstance(input, dict):
        for k, v in input.items():
            input[k] = norm(v)
        return input
    else:
        return norm(input)