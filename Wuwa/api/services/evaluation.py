import sys

from analytics.services import evaluation as _evaluation

sys.modules[__name__] = _evaluation
