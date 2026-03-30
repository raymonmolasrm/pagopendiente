require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('pago')
    .setDescription('Crear un nuevo pago pendiente')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('limpiar')
    .setDescription('Mover pagos ya completados al canal de pagados')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registrando comandos slash...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Comandos registrados exitosamente.');
  } catch (error) {
    console.error(error);
  }
})();
