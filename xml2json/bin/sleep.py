import splunk.Intersplunk
import time
import sys
import os

DEFAULT = 10

if len(sys.argv) > 1:
    try:
        time.sleep(float(sys.argv[1]))
    except ValueError:
        time.sleep(DEFAULT)
else:
    time.sleep(DEFAULT)

results, u1, u2 = splunk.Intersplunk.getOrganizedResults()
splunk.Intersplunk.outputResults(results)
