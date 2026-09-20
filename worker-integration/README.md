# Windows worker integration

This folder is the bridge between the hosted Supabase queue and the existing TypeScript/Playwright PrintAutomation project.

The browser app can submit and watch commands with the publishable key. The Windows worker must use a Supabase secret/service-role credential because only the worker is allowed to call:

- `claim_next_command`
- `add_command_event`
- `complete_command`
- `fail_command`

Do NOT send that secret key in chat and do NOT place it in the web frontend.

## Required package in the existing Windows project

```powershell
npm install @supabase/supabase-js
```

## Worker `.env`

Add locally on the Windows machine:

```env
SUPABASE_URL=https://rbttwaiksvdzyavuypvx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_side_key
PRINT_AUTOMATION_WORKER_NAME=KKN-NSY-WORKER-01
```

## Integration

`src/webQueue/supabaseQueueClient.ts` is ready to copy into the existing project.

`src/webQueue/workerLoop.ts` deliberately accepts an `executeCommand(rawCommand, progress)` callback so it can feed each Supabase command into the project's existing parser/router rather than duplicating business logic.

The final hookup should be made against the exact current terminal/router entry point in the Windows source tree.
