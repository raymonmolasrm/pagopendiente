require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  InteractionType,
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {

  // ── /pago → abrir formulario ──────────────────────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === 'pago') {
    const modal = new ModalBuilder()
      .setCustomId('modal_pago')
      .setTitle('Nuevo Pago Pendiente');

    const usuarioInput = new TextInputBuilder()
      .setCustomId('campo_usuario')
      .setLabel('Usuario')
      .setPlaceholder('Nombre del usuario a pagar')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const montoInput = new TextInputBuilder()
      .setCustomId('campo_monto')
      .setLabel('Monto')
      .setPlaceholder('Ej: $5000')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const cbuInput = new TextInputBuilder()
      .setCustomId('campo_cbu')
      .setLabel('CBU / Alias')
      .setPlaceholder('CBU o alias de destino')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(usuarioInput),
      new ActionRowBuilder().addComponents(montoInput),
      new ActionRowBuilder().addComponents(cbuInput),
    );

    await interaction.showModal(modal);
    return;
  }

  // ── Submit del formulario → publicar embed en canal de pagos ─────────────
  if (
    interaction.type === InteractionType.ModalSubmit &&
    interaction.customId === 'modal_pago'
  ) {
    const usuario = interaction.fields.getTextInputValue('campo_usuario');
    const monto   = interaction.fields.getTextInputValue('campo_monto');
    const cbu     = interaction.fields.getTextInputValue('campo_cbu');

    const canalPagos = await client.channels.fetch(process.env.CANAL_PAGOS_ID);

    if (!canalPagos) {
      await interaction.reply({
        content: 'No se encontró el canal de pagos. Verificá el ID en `.env`.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('💳 Pago Pendiente')
      .setColor(0xFF0000)
      .addFields(
        { name: '👤 Usuario',   value: usuario, inline: true },
        { name: '💰 Monto',     value: monto,   inline: true },
        { name: '🏦 CBU/Alias', value: cbu,     inline: false },
        { name: '📋 Estado',    value: '⏳ Pendiente', inline: true },
        { name: '📅 Creado por', value: `<@${interaction.user.id}>`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Casino · Pagos' });

    const botonPagado = new ButtonBuilder()
      .setCustomId('btn_pagado')
      .setLabel('✅ Marcar como Pagado')
      .setStyle(ButtonStyle.Success);

    const fila = new ActionRowBuilder().addComponents(botonPagado);

    await canalPagos.send({ embeds: [embed], components: [fila] });

    await interaction.reply({
      content: `Pago pendiente creado exitosamente en <#${process.env.CANAL_PAGOS_ID}>.`,
      ephemeral: true,
    });
    return;
  }

  // ── Botón "Pagado" → mover al canal de pagados ───────────────────────────
  if (interaction.isButton() && interaction.customId === 'btn_pagado') {
    const mensaje = interaction.message;
    const embedOriginal = mensaje.embeds[0];

    if (!embedOriginal) {
      await interaction.reply({ content: 'No se encontró el embed.', ephemeral: true });
      return;
    }

    const canalPagados = await client.channels.fetch(process.env.CANAL_PAGADOS_ID);

    if (!canalPagados) {
      await interaction.reply({ content: 'No se encontró el canal de pagados. Verificá CANAL_PAGADOS_ID.', ephemeral: true });
      return;
    }

    // Reconstruir el embed con estado actualizado
    const embedActualizado = EmbedBuilder.from(embedOriginal)
      .setTitle('✅ Pago Completado')
      .setColor(0x00C851)
      .spliceFields(
        embedOriginal.fields.findIndex(f => f.name === '📋 Estado'),
        1,
        { name: '📋 Estado', value: '✅ Pagado', inline: true },
      )
      .addFields({
        name: '💼 Pagado por',
        value: `<@${interaction.user.id}>`,
        inline: true,
      })
      .setTimestamp();

    // Enviar al canal de pagados y eliminar del canal de pendientes
    await canalPagados.send({ embeds: [embedActualizado] });
    await mensaje.delete();

    await interaction.reply({
      content: `Pago marcado como pagado por <@${interaction.user.id}>.`,
      ephemeral: true,
    });
    return;
  }
});

client.login(process.env.DISCORD_TOKEN);
