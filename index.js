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
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_magazzino')
          .setPlaceholder('Seleziona prodotto');

        Object.keys(stock).forEach(prodotto => {
          selectMenu.addOptions({
            label: prodotto.charAt(0).toUpperCase() + prodotto.slice(1),
            value: prodotto
          });
        });

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const embed = createEmbed('📦 Magazzino', 'Seleziona il prodotto da gestire');
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }

      // Magazzino - Aggiungi Stock
      if (interaction.customId.startsWith('mag_aggiungi_')) {
        const prodotto = interaction.customId.replace('mag_aggiungi_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_mag_aggiungi_${prodotto}`)
          .setTitle(`Aggiungi Stock - ${prodotto}`);

        const quantitaInput = new TextInputBuilder()
          .setCustomId('quantita_input')
          .setLabel('Quantità da aggiungere')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row = new ActionRowBuilder().addComponents(quantitaInput);
        modal.addComponents(row);
        await interaction.showModal(modal);
      }

      // Magazzino - Togli Stock
      if (interaction.customId.startsWith('mag_togli_')) {
        const prodotto = interaction.customId.replace('mag_togli_', '');
        const modal = new ModalBuilder()
          .setCustomId(`modal_mag_togli_${prodotto}`)
          .setTitle(`Togli Stock - ${prodotto}`);

        const quantitaInput = new TextInputBuilder()
          .setCustomId('quantita_input')
          .setLabel('Quantità da togliere')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row = new ActionRowBuilder().addComponents(quantitaInput);
        modal.addComponents(row);
        await interaction.showModal(modal);
      }
    }

    // ========== SELECT MENU INTERACTIONS ==========
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_magazzino') {
        const prodotto = interaction.values[0];
        const stock = db.getStock(prodotto);

        const btnAggiungi = new ButtonBuilder()
          .setCustomId(`mag_aggiungi_${prodotto}`)
          .setLabel('➕ Aggiungi')
          .setStyle(ButtonStyle.Success);

        const btnTogli = new ButtonBuilder()
          .setCustomId(`mag_togli_${prodotto}`)
          .setLabel('➖ Togli')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(btnAggiungi, btnTogli);

        const embed = createEmbed(
          `📦 ${prodotto.toUpperCase()}`,
          `**Stock attuale:** ${stock}`,
          '#3498db'
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
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

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Magazzino - Modale Aggiungi Stock
      if (interaction.customId.startsWith('modal_mag_aggiungi_')) {
        const prodotto = interaction.customId.replace('modal_mag_aggiungi_', '');
        const quantita = parseInt(interaction.fields.getTextInputValue('quantita_input'));

        if (isNaN(quantita) || quantita <= 0) {
          const embed = createEmbed(
            '❌ Errore',
            'Inserisci una quantità valida (numero positivo)',
            '#ff0000'
          );
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const nuovoStock = db.aggiungiStock(prodotto, quantita);
        const embed = createEmbed(
          '✅ Stock Aggiunto',
          `**${prodotto.toUpperCase()}** → +${quantita}\n**Nuovo stock:** ${nuovoStock}`,
          '#00ff00'
        );
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Magazzino - Modale Togli Stock
      if (interaction.customId.startsWith('modal_mag_togli_')) {
        const prodotto = interaction.customId.replace('modal_mag_togli_', '');
        const quantita = parseInt(interaction.fields.getTextInputValue('quantita_input'));

        if (isNaN(quantita) || quantita <= 0) {
          const embed = createEmbed(
            '❌ Errore',
            'Inserisci una quantità valida (numero positivo)',
            '#ff0000'
          );
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const nuovoStock = db.togliStock(prodotto, quantita);
        const embed = createEmbed(
          '✅ Stock Rimosso',
          `**${prodotto.toUpperCase()}** → -${quantita}\n**Nuovo stock:** ${nuovoStock}`,
          '#ff0000'
        );
        await interaction.reply({ embeds: [embed], ephemeral: true });
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
