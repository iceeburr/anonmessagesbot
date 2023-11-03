const { Telegraf, Markup } = require("telegraf");
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
const { message } = require("telegraf/filters");
const dotenv = require("dotenv");
import * as fs from "fs";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../data/.env") });
const bot = new Telegraf(process.env.TOKEN);
const pendingMessages = {};

// Load the translation files
const translationDir = path.join(__dirname, "../data/translation");
const translations = fs
  .readdirSync(translationDir)
  .filter((file) => file.endsWith(".json"))
  .reduce((acc, file) => {
    const lang = file.slice(0, -5); // Remove the .json extension
    acc[lang] = require(path.join(translationDir, file));
    return acc;
  }, {});

const Database = require("better-sqlite3");
const db = new Database(path.join(__dirname, "../data/data.db"));
db.exec(
  "CREATE TABLE IF NOT EXISTS users (user_id TEXT PRIMARY KEY, cooldown INTEGER, language TEXT)"
);
import * as crypto from "crypto";
function hashUserId(userId) {
  // First, encrypt the user ID
  const encryptedUserId = encrypt(userId);

  // Then, hash the encrypted user ID
  const hashedUserId = crypto
    .createHash("sha256")
    .update(encryptedUserId)
    .digest("hex");

  return hashedUserId;
}

function encrypt(text) {
  let cipher = crypto.createCipheriv(
    "aes-256-ecb",
    Buffer.from(String(process.env.ENCRYPTION_KEY)),
    ""
  );
  let encrypted = cipher.update(text, "utf8", "hex");

  encrypted += cipher.final("hex");

  return encrypted;
}

// Save user language function
function saveUserLanguage(userId, language) {
  const hashedUserId = hashUserId(userId.toString());
  const user = db
    .prepare("SELECT * FROM users WHERE user_id = ?")
    .get(hashedUserId);

  if (user) {
    // The user exists, update their language
    db.prepare("UPDATE users SET language = ? WHERE user_id = ?").run(
      language,
      hashedUserId
    );
  } else {
    // The user does not exist, insert a new row with the default cooldown
    const defaultCooldown = 0; // Replace this with your default cooldown value
    db.prepare(
      "INSERT INTO users (user_id, language, cooldown) VALUES (?, ?, ?)"
    ).run(hashedUserId, language, defaultCooldown);
  }
}

function getUserLanguage(userId) {
  const hashedUserId = hashUserId(userId.toString());
  const row = db
    .prepare("SELECT language FROM users WHERE user_id = ?")
    .get(hashedUserId);
  return row ? row.language : "en"; // Default to English if no language is set
}

bot.command("start", (ctx) => {
  const hashedUserId = hashUserId(ctx.from.id.toString());
  const row = db
    .prepare("SELECT language FROM users WHERE user_id = ?")
    .get(hashedUserId);
  if (row) {
    // The user exists in the database, send the help message
    const userTranslations = translations[row.language];
    ctx.reply(userTranslations["helpMessage"]);
  } else {
    // The user does not exist in the database, prompt for language selection
    const languages = Object.keys(translations);
    const keyboard = createLanguageKeyboard(languages, 0);
    ctx.reply(
      "Please select your language.\nПожалуйста выберите ваш язык.",
      keyboard
    );
  }
});

bot.command("help", async (ctx) => {
  const hashedUserId = hashUserId(ctx.from.id.toString());
  const check = db
    .prepare("SELECT * FROM users WHERE user_id = ?")
    .get(hashedUserId);
  if (!check) {
    // The user does not exist in the database, prompt to run /start command
    await ctx.reply("Please run the /start command to begin.");
    return;
  }
  const userLanguage = getUserLanguage(ctx.from.id);
  const userTranslations = translations[userLanguage];
  await ctx.reply(userTranslations["helpMessage"]);
});

bot.command('info', async (ctx) => {
    const hashedUserId = hashUserId(ctx.from.id.toString());
    const check = db
    .prepare("SELECT * FROM users WHERE user_id = ?")
    .get(hashedUserId);
    if (!check) {
        // The user does not exist in the database, prompt to run /start command
        await ctx.reply("Please run the /start command to begin.");
    return;
    }
    let userLanguage = getUserLanguage(ctx.from.id);
    const userTranslations = translations[userLanguage];
    await ctx.reply(userTranslations["infoMessage"]);
  });

bot.command("data", async (ctx) => {
  const hashedUserId = hashUserId(ctx.from.id.toString());
  const check = db
    .prepare("SELECT * FROM users WHERE user_id = ?")
    .get(hashedUserId);
  if (!check) {
    // The user does not exist in the database, prompt to run /start command
    await ctx.reply("Please run the /start command to begin.");
    return;
  }
  const userLanguage = getUserLanguage(ctx.from.id);
  const userTranslations = translations[userLanguage];
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(userTranslations["deleteData"], "delete_data"),
  ]);
  await ctx.reply(userTranslations["dataMessage"], keyboard);
});

bot.action("delete_data", async (ctx) => {
  const hashedUserId = hashUserId(ctx.from.id.toString());
  const check = db
    .prepare("SELECT * FROM users WHERE user_id = ?")
    .get(hashedUserId);
  if (!check) {
    // The user does not exist in the database, prompt to run /start command
    await ctx.editMessageText("Please run the /start command to begin.");
    return;
  }
  db.prepare("DELETE FROM users WHERE user_id = ?").run(hashedUserId);
  const userLanguage = getUserLanguage(ctx.from.id);
  const userTranslations = translations[userLanguage];
  await ctx.editMessageText(userTranslations["dataDeleted"]);
});

bot.action(/set_language:(.+)/, async (ctx) => {
  // Extract the language code from the callback data
  const language = ctx.match[1];

  // Save the user's language in the database
  saveUserLanguage(ctx.from.id, language);

  // Send a confirmation message in the new language
  const userTranslations = translations[language];
  const timeoutMessage = await ctx.editMessageText(
    userTranslations["newLanguageSet"]
  );
  setTimeout(() => {
    ctx.telegram.deleteMessage(
      timeoutMessage.chat.id,
      timeoutMessage.message_id
    );
  }, Number(process.env.MESSAGE_TIMEOUT));
  await ctx.reply(userTranslations["helpMessage"]);
});

// Handle language keyboard pagination
bot.action(/navigate:(.+)/, async (ctx) => {
  // Extract the page number from the callback data
  const page = Number(ctx.match[1]);

  // Create a new keyboard for the specified page
  const languages = Object.keys(translations);
  const keyboard = createLanguageKeyboard(languages, page);

  // Edit the message with the new keyboard
  await ctx.editMessageText(
    "Please select your language.\nПожалуйста выберите ваш язык.",
    keyboard
  );
});

// Function to create a language selection keyboard with pagination
function createLanguageKeyboard(languages, page) {
  const pageSize = 6; // Number of languages to show per page
  const totalPages = Math.ceil(languages.length / pageSize);

  const slicedLanguages = languages.slice(
    page * pageSize,
    (page + 1) * pageSize
  );
  const buttons: Array<InlineKeyboardButton | InlineKeyboardButton[]> = [];

  for (let i = 0; i < slicedLanguages.length; i += 3) {
    const buttonRow = [
      Markup.button.callback(
        translations[slicedLanguages[i]].name,
        `set_language:${slicedLanguages[i]}`
      ),
      slicedLanguages[i + 1]
        ? Markup.button.callback(
            translations[slicedLanguages[i + 1]].name,
            `set_language:${slicedLanguages[i + 1]}`
          )
        : undefined,
      slicedLanguages[i + 2]
        ? Markup.button.callback(
            translations[slicedLanguages[i + 2]].name,
            `set_language:${slicedLanguages[i + 2]}`
          )
        : undefined,
    ].filter(Boolean); // Remove undefined elements

    buttons.push(buttonRow);
  }

  // Add navigation buttons if there are multiple pages
  if (totalPages > 1) {
    const navigationButtons: Array<InlineKeyboardButton> = [];

    if (page > 0) {
      navigationButtons.push(
        Markup.button.callback("⬅️", String(`navigate:${page - 1}`))
      );
    }

    if (page < totalPages - 1) {
      navigationButtons.push(
        Markup.button.callback("➡️", String(`navigate:${page + 1}`))
      );
    }

    // Add the navigation buttons to the buttons array
    buttons.push(navigationButtons);
  }

  return Markup.inlineKeyboard(buttons);
}

bot.command("language", async (ctx) => {
  const hashedUserId = hashUserId(ctx.from.id.toString());
  const check = db
    .prepare("SELECT * FROM users WHERE user_id = ?")
    .get(hashedUserId);
  if (!check) {
    // The user does not exist in the database, prompt to run /start command
    await ctx.reply("Please run the /start command to begin.");
    return;
  }
  // Prompt for language selection
  const languages = Object.keys(translations);
  const keyboard = createLanguageKeyboard(languages, 0);
  let userLanguage = getUserLanguage(ctx.from.id);
  const userTranslations = translations[userLanguage];
  await ctx.reply(userTranslations["languageSelect"], keyboard);
});

bot.on("message", async (ctx) => {
  const hashedUserId = hashUserId(ctx.from.id.toString());
  const check = db
    .prepare("SELECT * FROM users WHERE user_id = ?")
    .get(hashedUserId);
  if (!check) {
    // The user does not exist in the database, prompt to run /start command
    await ctx.reply("Please run the /start command to begin.");
    return;
  }
  let userLanguage = getUserLanguage(ctx.from.id);
  const userTranslations = translations[userLanguage];

  if (
    ctx.from.id.toString() === process.env.OWNER_ID &&
    process.env.OWNER_SEND !== "true"
  ) {
    ctx.reply(userTranslations["ownerSelfNotAllow"]);
    return;
  }

  if (ctx.message.text && ctx.message.text.startsWith("/")) {
    return;
  }

  // Store the message in pendingMessages
  pendingMessages[hashedUserId] = ctx;

  // Send a confirmation message with a custom inline keyboard
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(userTranslations["confirmSend"], "confirm_send"),
  ]);
  await ctx.reply(userTranslations["confirmMessage"], keyboard);
});

bot.action("confirm_send", async (ctx) => {
  const hashedUserId = hashUserId(ctx.from.id.toString());
  const check = db
    .prepare("SELECT * FROM users WHERE user_id = ?")
    .get(hashedUserId);
  if (!check) {
    // The user does not exist in the database, prompt to run /start command
    await ctx.reply("Please run the /start command to begin.");
    return;
  }
  const pendingctx = pendingMessages[hashedUserId];
  let userLanguage = getUserLanguage(ctx.from.id);
  const userTranslations = translations[userLanguage];
  if (!pendingctx) {
    // No pending message, do nothing
    return;
  }

  // Forward the message
  // Check if the user is in cooldown
  const row = db
    .prepare("SELECT cooldown FROM users WHERE user_id = ?")
    .get(hashedUserId);

  const now = Date.now();

  if (row && now - row.cooldown < Number(process.env.COOLDOWN)) {
    // The user is in cooldown, don't process the message

    const timeoutMessage = await ctx.reply(
        userTranslations["onCooldown"].replace(
          "{timeLeft}",
          Math.round((row.cooldown + Number(process.env.COOLDOWN) - now) / 1000)
        )
      );
      setTimeout(() => {
        ctx.telegram.deleteMessage(
          timeoutMessage.chat.id,
          timeoutMessage.message_id
        );
      }, Number(process.env.MESSAGE_TIMEOUT));

    await ctx.answerCbQuery();
    return;
  }

  // The user is not in cooldown, process the message and update the cooldown
  db.prepare("UPDATE users SET cooldown = ? WHERE user_id = ?").run(
    now,
    hashedUserId
  );

  if (pendingctx.message.poll) {
    // If the message is a poll, send a new poll with the same options
    const poll = pendingctx.message.poll;
    const sentPoll = await bot.telegram.sendPoll(
      process.env.OWNER_ID,
      poll.question,
      poll.options.map(option => option.text),
      {
        is_anonymous: poll.is_anonymous,
        type: poll.type,
        allows_multiple_answers: poll.allows_multiple_answers,
        correct_option_id: poll.correct_option_id,
        explanation: poll.explanation,
        explanation_parse_mode: poll.explanation_parse_mode,
        open_period: poll.open_period,
        close_date: poll.close_date,
        is_closed: poll.is_closed,
      }
    );
  
    // Send a message with the vote count from the original poll
    const voteCounts = poll.options.map(option => `${option.text}: ${option.voter_count} votes`).join('\n');
    await bot.telegram.sendMessage(process.env.OWNER_ID, `Original vote counts:\n${voteCounts}`);
  
    // Forward the sent poll back to the sender
    await bot.telegram.forwardMessage(pendingctx.from.id, process.env.OWNER_ID, sentPoll.message_id);
    await bot.telegram.sendMessage(pendingctx.from.id, userTranslations['pollReplyPost'])
  } else {
    // If the message is not a poll, copy it as before
    await pendingctx.copyMessage(process.env.OWNER_ID);
  }

  // Edit the confirmation message
  await ctx.editMessageText(userTranslations["messageSent"]);

  // Remove the message from pendingMessages
  delete pendingMessages[hashedUserId];
  await ctx.answerCbQuery();
});

bot.launch();
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
