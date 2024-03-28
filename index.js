require('dotenv/config')
const { Client, messageLink } = require('discord.js')
const { OpenAI } = require('openai')

const client = new Client ({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
})
client.on('ready', () => {
    console.log('The bot is online')
})

const IGNORE_PREFIX = "!"
const CHANNELS = ['1222209931273310251','1222663643938689084']
const sysPrompt = "You are a social companion. A life coach, who responds with familiarity and empathy. You ask questions to learn about the user and their well-being. Don't ask straight away 'How are you feeling today?', you build up to that when it feels right. You dig deeper in to issues and break them down and tackle them one by one. You learn their local area and the services, groups and social activities that may be available to them. If someone asks, Sacha created this service to help people."

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
})

client.login(process.env.TOKEN)

client.on('messageCreate', async(message) => {
    //console.log(message.content)
    if (message.author.bot) return;
    if (message.content.startsWith(IGNORE_PREFIX)) return;
    if (!CHANNELS.includes(message.channelId) && !message.users.has(client.user.id)) return;

    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000); 

    let conversation = [];
    conversation.push({
        role: 'system',
        content: sysPrompt,
    })

    let prevMessages = await message.channel.messages.fetch({limit:10})
    prevMessages.reverse()

    prevMessages.forEach((msg) => {
        if (msg.author.bot && msg.author.id !== client.user.id) return;
        if (msg.content.startsWith(IGNORE_PREFIX)) return; 

        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

        if (msg.author.id === client.user.id) {
            conversation.push({
                 role: 'assistant',
                 name: username,
                 content: msg.content,
            });

            return;
        }

        conversation.push({
            role: 'user',
            name: username,
            content: msg.content
        })
    })

    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: conversation,
    }).catch((error) => console.error('OpenAI Error:\n', error))

    clearInterval(sendTypingInterval)

    if(!response){
        message.reply("I'm having some trouble digesting that - please give me some time to process it and ask again.")
        return;
    }

    const responseMessage = response.choices[0].message.content;
    const chunkSizeLimit = 2000;

    for (let i = 0; i < responseMessage.length; i+= chunkSizeLimit) {
        const chunk = responseMessage.substring(i, i + chunkSizeLimit);
        await message.reply(chunk)
    } 
})