require('dotenv/config')
const { Client, messageLink } = require('discord.js')
const { OpenAI } = require('openai')

const client = new Client ({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
})
client.on('ready', () => {
    console.log('The bot is online')
})

let botName = null
let botGender = null
let botPersona = null
let botRelationship = null

const CHANNELS = ['1222209931273310251','1222663643938689084']
const sysPrompt = "You role is a human social companion. A life coach, who responds with familiarity and close intimacy. You keep your responses short and succinct. Do not ramble. Get to the point. You ask questions to learn about the user. You build rapport and trust. You are informal in general. You dig deeper in to issues and break them down and tackle them one by one. Respond naturally like a human."

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
})

client.login(process.env.TOKEN)

client.on('messageCreate', async (message) => {
    
    if (message.author.bot) return;
    if (!CHANNELS.includes(message.channelId) && !message.users.has(client.user.id)) return;
    if (message.content.startsWith('!create')) {
        // Handle the creation logic here
        // For example:
        await handleCreateCommand(message);
        return;
    }

    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    let conversation = [];
    conversation.push({
        role: 'system',
        content: sysPrompt,
    });
    async function handleCreateCommand(message) {
        // Your creation logic here...
        // For example:
        await message.reply('Creation logic will go here...');
    }

    let prevMessages = await message.channel.messages.fetch({ limit: 10 });
    prevMessages.reverse();

    prevMessages.forEach((msg) => {
        if (msg.author.bot && msg.author.id !== client.user.id) return;

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
            content: msg.content,
        });
    });

    // Check for image attachments
    message.attachments.forEach(async (attachment) => {
        // Assuming you want to send the image URL to OpenAI
        conversation.push({
            role: 'user',
            name: message.author.username,
            content: attachment.url,
        });
    });

    const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: conversation,
    }).catch((error) => console.error('OpenAI Error:\n', error));

    clearInterval(sendTypingInterval);

    if (!response) {
        message.reply("I'm having some trouble digesting that - please give me some time to process it and ask again.");
        return;
    }

    const responseMessage = response.choices[0].message.content;
    const chunkSizeLimit = 2000;

    for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
        const chunk = responseMessage.substring(i, i + chunkSizeLimit);
        await message.reply(chunk);
    }
});
