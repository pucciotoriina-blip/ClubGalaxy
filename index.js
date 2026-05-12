const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes } = require('discord.js');
const dotenv = require('dotenv');
const db = require('./database');
const { commands, handleCommands } = require('./comandi');

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// ============================================
// FUNZIONI UTILI
// ============================================

function hasAdminRole(member) {
  const idDirettore = process.env.ID_RUOLO_DIRETTORE;
  const idCEO = process.env.ID_RUOLO_CEO;
  return member.roles.cache.has(idDirettore) || member.roles.cache.has(idCEO);
}

function createEmbed(title, description, color = '#0099ff') {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: 'BOT GALAZY' });
}

// ============================================
// EVENTO: BOT READY
// ============================================

client.on('ready', async () => {
  console.log(`✅ Bot loggato come ${client.user.tag}`);
  client.user.setActivity('gestione turni 📋', { type: 'WATCHING' });

  // Registra i comandi slash
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const guildId = process.env.GUILD_ID;

  try {
    console.log('🔄 Registrazione comandi slash...');
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, guildId),
      { body: commands }
    );
    console.log('✅ Comandi slash registrati!');
  } catch (error) {
    console.error('Errore nella registrazione dei comandi:', error);
  }
});

// ============================================
// EVENTO: INTERAZIONI (Buttons, Select Menu, Modal)
// ============================================

client.on('interactionCreate', async (interaction) => {
  try {
    // Gestisci i comandi slash
    await handleCommands(interaction);

    // ========== BUTTON INTERACTIONS ==========
    if (interaction.isButton()) {
      const userId = interaction.user.id;
      const userName = interaction.user.username;
      const userTag = interaction.user.tag;

      // Timbrare IN
      if (interaction.customId === 'btn_timbrare_in') {
        db.addTimbratura(userId, userName, userTag, 'IN');
        const embed = createEmbed(
          '✅ Timbratura Registrata',
          `${interaction.user} è **ENTRATO IN SERVIZIO**\n📅 ${new Date().toLocaleString('it-IT')}`,
          '#00ff00'
        );
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Timbrare OUT
      if (interaction.customId === 'btn_timbrare_out') {
        db.addTimbratura(userId, userName, userTag, 'OUT');
        const embed = createEmbed(
          '✅ Timbratura Registrata',
          `${interaction.user} è **USCITO DAL SERVIZIO**\n📅 ${new Date().toLocaleString('it-IT')}`,
          '#ff6600'
        );
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Info Personali
      if (interaction.customId === 'btn_info') {
        const timbrature = db.getTimbratureUtente(userId);
        const vendite = db.getVenditeUtente(userId);
        const totaleFatture = db.getTotaleFattureUtente(userId);
        const totaleVendite = db.getTotaleVenditeUtente(userId);

        // Calcolo ore servizio
        let oreServizio = 0;
        for (let i = 0; i < timbrature.length; i += 2) {
          if (timbrature[i].azione === 'IN' && timbrature[i + 1]?.azione === 'OUT') {
            const inTime = new Date(timbrature[i].timestamp);
            const outTime = new Date(timbrature[i + 1].timestamp);
            oreServizio += (outTime - inTime) / (1000 * 60 * 60);
          }
        }

        const embed = createEmbed(
          `📊 Statistiche - ${userName}`,
          `**⏱️ Ore di servizio:** ${oreServizio.toFixed(2)}\n` +
          `**💰 Totale Vendite:** €${totaleVendite.toFixed(2)}\n` +
          `**🧾 Totale Fatture:** €${totaleFatture.toFixed(2)}\n` +
          `**📈 Numero Vendite:** ${vendite.length}`
        );
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Servizio (chi è in servizio)
      if (interaction.customId === 'btn_servizio') {
        const timbrature = db.getAllTimbrature();
        const inServizio = {};

        // Calcola chi è attualmente in servizio
        timbrature.forEach(t => {
          if (t.azione === 'IN') {
            if (!inServizio[t.userId]) {
              inServizio[t.userId] = { userName: t.userName, entrataTime: new Date(t.timestamp) };
            }
          } else if (t.azione === 'OUT') {
            delete inServizio[t.userId];
          }
        });

        const elenco = Object.entries(inServizio)
          .map(([id, data]) => `🟢 ${data.userName}`)
          .join('\n') || 'Nessuno in servizio';

        const embed = createEmbed('👥 Chi è in Servizio', elenco, '#00ff00');
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Registro Vendite
      if (interaction.customId === 'btn_register_vendita') {
        const modal = new ModalBuilder()
          .setCustomId('modal_vendita')
          .setTitle('Registra Vendita');

        const cosaiInput = new TextInputBuilder()
          .setCustomId('vendita_cosa')
          .setLabel('Cosa hai venduto?')
          .setStyle(TextInputStyle.Paragraph);

        const prezzoInput = new TextInputBuilder()
          .setCustomId('vendita_prezzo')
          .setLabel('Prezzo')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const convenzioneInput = new TextInputBuilder()
          .setCustomId('vendita_convenzione')
          .setLabel('Convenzione? (si/no)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const societaInput = new TextInputBuilder()
          .setCustomId('vendita_societa')
          .setLabel('Quale società?')
          .setStyle(TextInputStyle.Short);

        const row1 = new ActionRowBuilder().addComponents(cosaiInput);
        const row2 = new ActionRowBuilder().addComponents(prezzoInput);
        const row3 = new ActionRowBuilder().addComponents(convenzioneInput);
        const row4 = new ActionRowBuilder().addComponents(societaInput);

        modal.addComponents(row1, row2, row3, row4);
        await interaction.showModal(modal);
      }

      // Magazzino
      if (interaction.customId === 'btn_magazzino') {
        const stock = db.getAllStock();

        const btnPrendiMedikit = new ButtonBuilder()
          .setCustomId('mag_prendi_medikit')
          .setLabel('🩺 Prendi Medikit')
          .setStyle(ButtonStyle.Secondary);

        const btnRimettiMedikit = new ButtonBuilder()
          .setCustomId('mag_rimetti_medikit')
          .setLabel('🩺 Rimetti Medikit')
          .setStyle(ButtonStyle.Success);

        const btnPrendiSoleBende = new ButtonBuilder()
          .setCustomId('mag_prendi_sole_bende')
          .setLabel('🩹 Prendi Sole Bende')
          .setStyle(ButtonStyle.Secondary);

        const btnRimettiSoleBende = new ButtonBuilder()
          .setCustomId('mag_rimetti_sole_bende')
          .setLabel('🩹 Rimetti Sole Bende')
          .setStyle(ButtonStyle.Success);

        const row1 = new ActionRowBuilder().addComponents(btnPrendiMedikit, btnRimettiMedikit);
        const row2 = new ActionRowBuilder().addComponents(btnPrendiSoleBende, btnRimettiSoleBende);

        const embed = createEmbed(
          '📦 Magazzino EMS',
          `**🩺 Medikit:** ${stock.medikit}\n` +
          `**🩹 Sole Bende:** ${stock.sole_bende}\n\n` +
          'Usa i pulsanti sotto per prendere o rimettere gli oggetti. Ogni azione aggiorna subito lo stack.',
          '#3498db'
        );

        await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: false });
      }

      // Magazzino - Prendi/Rimetti Oggetto
      if (interaction.customId.startsWith('mag_prendi_') || interaction.customId.startsWith('mag_rimetti_')) {
        const prodotto = interaction.customId.replace('mag_prendi_', '').replace('mag_rimetti_', '');
        const nomeProdotto = prodotto === 'medikit' ? 'Medikit' : 'Sole Bende';
        const isRimetti = interaction.customId.startsWith('mag_rimetti_');

        if (!isRimetti && db.getStock(prodotto) <= 0) {
          const embed = createEmbed(
            '❌ Stock Esaurito',
            `Non ci sono più ${nomeProdotto.toLowerCase()} disponibili in magazzino.`,
            '#ff0000'
          );
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const nuovoStock = isRimetti ? db.aggiungiStock(prodotto, 1) : db.togliStock(prodotto, 1);
        const stock = db.getAllStock();

        const embed = createEmbed(
          isRimetti ? '✅ Oggetto Rimesso' : '✅ Oggetto Preso',
          `Hai ${isRimetti ? 'rimesso' : 'preso'} 1 **${nomeProdotto}**.

` +
          `**Adesso lo stack è:**\n🩺 Medikit: ${stock.medikit}\n🩹 Sole Bende: ${stock.sole_bende}`,
          isRimetti ? '#00ff00' : '#ffcc00'
        );

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

    }



    // ========== MODAL SUBMISSIONS ==========
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal_vendita') {
        const cosa = interaction.fields.getTextInputValue('vendita_cosa');
        const prezzo = interaction.fields.getTextInputValue('vendita_prezzo');
        const convenzione = interaction.fields.getTextInputValue('vendita_convenzione');
        const societa = interaction.fields.getTextInputValue('vendita_societa');

        const vendita = db.addVendita(
          interaction.user.id,
          interaction.user.username,
          cosa,
          prezzo,
          convenzione.toLowerCase() === 'si' ? true : false,
          societa
        );

        const fattura = db.addFattura(
          interaction.user.id,
          interaction.user.username,
          cosa,
          prezzo
        );

        const embed = createEmbed(
          '✅ Vendita Registrata',
          `**Articolo:** ${cosa}\n**Prezzo:** €${prezzo}\n**Convenzione:** ${convenzione}\n**Società:** ${societa || 'N/D'}\n\n🧾 **Fattura ID:** \`${fattura.id}\``,
          '#00ff00'
        );

        await interaction.reply({ embeds: [embed], ephemeral: false });
      }


    }
  } catch (error) {
    console.error('Errore in interazione:', error);
  }
});

// ============================================
// LOGIN
// ============================================

client.login(process.env.DISCORD_TOKEN);
