# Admin Module Structure

The shared admin shell currently remains in `apps/coach`. Each product module has a target folder under `apps/coach/src/modules/`:

- coach
- academy
- cup
- plus
- connect
- club

The current large `App.jsx` is preserved so the app still runs. Refactoring should be incremental: move one complete screen at a time into the module folder, test, then commit.
