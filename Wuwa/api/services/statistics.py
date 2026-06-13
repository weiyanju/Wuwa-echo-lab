import sys

from analytics.services import statistics as _statistics

sys.modules[__name__] = _statistics
