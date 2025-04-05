import 'dotenv/config'
import { Client, GatewayIntentBits } from 'discord.js'
import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

const BOT_PREFIX = '!ai'

client.once('ready', () => {
  console.log(`Bot is online as ${client.user.tag}`)

  const channel = client.channels.cache.get(process.env.DEFAULT_CHANNEL_ID)
  if (channel) {
    channel.send('[ AUTO ] Bot is now online and ready to assist! 🚀')
    channel.send(
      '[ AUTO ] To start chatting with the bot, please begin your message with !ai followed by your query.'
    )
  }
})

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(BOT_PREFIX)) return
  await message.channel.sendTyping()
  const query = message.content.slice(BOT_PREFIX.length).trim()
  if (!query) return message.reply('Please provide a prompt!')

  const messages = await message.channel.messages.fetch({ limit: 10 })
  const messageHistory = messages.reverse().reduce((history, msg) => {
    if (msg.author.id !== client.user.id) {
      history.push({ role: 'user', content: msg.content })
    } else {
      history.push({ role: 'assistant', content: msg.content })
    }
    return history
  }, [])

  messageHistory.push({ role: 'user', content: query })
  messageHistory.unshift({
    role: 'system',
    content: `
    You are a helpful AI assistant specializing in providing clear, concise, and polite answers to wide range of questions.
    `,
  })
  const cleanHistory = messageHistory.filter(
    (message) => !message.content.startsWith('[ AUTO ]')
  )

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: cleanHistory,
      max_tokens: 500,
    })

    const replyText =
      response.choices[0]?.message?.content || 'Unable to generate a response.'

    await message.reply(replyText)
  } catch (error) {
    console.error('Error:', error)
    await message.reply('There was an error generating a response.')
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)

process.on('SIGINT', async () => {
  console.log('Bot disconnected ')
  const channel = client.channels.cache.get(process.env.DEFAULT_CHANNEL_ID)
  if (channel) {
    channel.send('[ AUTO ] Goodbye! The bot is disconnecting... 👋')
  }

  await client.destroy()

  process.exit()
})
