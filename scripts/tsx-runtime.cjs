// tsx expects process.geteuid on POSIX. Windows does not expose it, including
// restricted automation environments; a stable non-zero value is sufficient
// for its per-user temporary-directory name.
if (typeof process.geteuid !== "function") {
  process.geteuid = () => 1;
}
