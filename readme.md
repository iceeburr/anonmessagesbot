# Project Welcome

Welcome to this project! The bot is currently in development, and documentation is not available at the moment. If you wish to self-host it, all you need to do is clone the repository and start it from `src/index.ts`. There is a testing script that automatically converts the TypeScript index to JavaScript. To use it, run `npm run dev`. Make sure to install all the packages with `npm i`.

You must create a database and `.env` files in the data folder. An example `.env` file is provided. The database file must be called `data.db`, and the `.env` file should be named `.env`.

For any questions, feel free to contact me. The bot is likely already alive at [https://t.me/messagesanonymbot](https://t.me/messagesanonymbot). If not, you can check [https://t.me/iceeburr](https://t.me/iceeburr). To check the status of the bot, visit [https://status.iceeburr.ru](https://status.iceeburr.ru).

## Planned Features

- Reply to questions
- Block users
- Multi-user usage
- More functionalities

## Translations

English, Russian, and Bulgarian translations of the interface are 100% finished, as I am a native speaker of all three. All others were translated using DeepL. If you can help translate them, please make a pull request. If you don't know how, just contact me.

## Data Security and Privacy

The bot encrypts and hashes user IDs in the database. This is one of the bot's policies, not collecting any data and not allowing anyone to collect it. In the future, more features will be added that may require the collection of more data and other message logs. However, this does not mean the policy will change. Logs are not kept, and data is encrypted ALWAYS.

## Future Changes

Expect more changes soon.
This project is licensed under MIT.