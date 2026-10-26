# Use scoped reading

Give your agent the repository root, subsystem and observed behavior. Ask it to identify relevant symbols, callers, tests and one accepted pattern before editing. Grant read-only code access first; refuse unrelated private directories.

Check its evidence map against the repository. Run the boundary-fix eval and confirm that it found callers without reading the entire tree. Approve write scope only after the map and acceptance check agree.
