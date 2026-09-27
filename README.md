# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Push notifications

Expense alerts are sent by a Firebase Cloud Function to other members of the group. Deploy it to the existing Firebase project with:

```sh
npx firebase-tools deploy --only functions --project roomsplit-86601
```

Cloud Functions deployment requires the Firebase project to use the Blaze billing plan. Each device must enable notifications from the RoomSplit dashboard. On iPhone, use iOS 16.4 or later, add RoomSplit to the Home Screen from Safari, open the installed app, and enable notifications there. Android and desktop browsers need notification permission for the RoomSplit site.
