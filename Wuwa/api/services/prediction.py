import sys

from analytics.services import prediction as _prediction

sys.modules[__name__] = _prediction
