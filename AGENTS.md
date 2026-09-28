# Project architecture

- Client-imported server-function modules load privileged server clients only inside authenticated or trusted handlers, preventing secret-bearing modules from entering browser bundles.