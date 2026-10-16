// Template bootstrap; returning managed sign-in refreshes the reactive session.
import { authClient } from "./lib/auth";
import "./__main";

void authClient.managedAuth.handleRedirect();
