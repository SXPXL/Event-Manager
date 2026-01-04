from slowapi import Limiter
from slowapi.util import get_remote_address

# This creates the "Bouncer"
# get_remote_address uses the user's IP address to track how many requests they make
limiter = Limiter(key_func=get_remote_address)