const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('./database');

const commands = [];

// ============================================
// FUNZIONE UTILITY
// ============================================

function createEmbed(title, description, color = '#0099ff') {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: 'BOT GALAZY' });
}

function hasAdminRole(member) {
  const idDirettore = process.env.ID_RUOLO_DIRETTORE;
  const idCEO = process.env.ID_RUOLO_CEO;
  return member.roles.cache.has(idDirettore) || member.roles.cache.has(idCEO);
}

// ============================================
// COMANDO: /menu
// ============================================

commands.push(
  new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Mostra il menu principale di timbratura')
    .toJSON()
);

commands.push(
  new SlashCommandBuilder()
    .setName('registrovendite')
    .setDescription('Apri il modulo per registrare una vendita')
    .toJSON()
);

commands.push(
  new SlashCommandBuilder()
    .setName('magazzino')
    .setDescription('Mostra lo stato del magazzino')
    .toJSON()
);

// ============================================
// COMANDO: /forzastop (Solo Direttore/CEO)
// ============================================

commands.push(
  new SlashCommandBuilder()
    .setName('forzastop')
    .setDescription('Forza lo stop della timbratura di un dipendente')
    .addUserOption(option =>
      option
        .setName('dipendente')
        .setDescription('Il dipendente di cui forzare lo stop')
        .setRequired(true)
    )
    .toJSON()
);

// ============================================
// COMANDO: /aggiungiore (Solo Direttore/CEO)
// ============================================

commands.push(
  new SlashCommandBuilder()
    .setName('aggiungiore')
    .setDescription('Aggiungi ore al cartellino di un dipendente')
    .addUserOption(option =>
      option
        .setName('dipendente')
        .setDescription('Il dipendente')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option
        .setName('ore')
        .setDescription('Numero di ore da aggiungere')
        .setRequired(true)
    )
    .toJSON()
);

// ============================================
// COMANDO: /togliore (Solo Direttore/CEO)
// ============================================

commands.push(
  new SlashCommandBuilder()
    .setName('togliore')
    .setDescription('Togli ore dal cartellino di un dipendente')
    .addUserOption(option =>
      option
        .setName('dipendente')
        .setDescription('Il dipendente')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option
        .setName('ore')
        .setDescription('Numero di ore da togliere')
        .setRequired(true)
    )
    .toJSON()
);

// ============================================
// COMANDO: /riforniscimagazzino (Solo Direttore/CEO)
// ============================================

commands.push(
  new SlashCommandBuilder()
    .setName('riforniscimagazzino')
    .setDescription('Aggiungi stock al magazzino')
    .addStringOption(option =>
      option
        .setName('prodotto')
        .setDescription('Tipo di prodotto')
        .setRequired(true)
        .addChoices(
          { name: 'Cibo', value: 'cibo' },
          { name: 'Bevanda', value: 'bevanda' },
          { name: 'Gratta e Vinci', value: 'gratta_e_vinci' },
          { name: 'Alcolici', value: 'alcolici' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('quantita')
        .setDescription('Quantità da aggiungere')
        .setRequired(true)
    )
    .toJSON()
);

// ============================================
// COMANDO: /levastock (Solo Direttore/CEO)
// ============================================

commands.push(
  new SlashCommandBuilder()
    .setName('levastock')
    .setDescription('Rimuovi stock dal magazzino')
    .addStringOption(option =>
      option
        .setName('prodotto')
        .setDescription('Tipo di prodotto')
        .setRequired(true)
        .addChoices(
          { name: 'Cibo', value: 'cibo' },
          { name: 'Bevanda', value: 'bevanda' },
          { name: 'Gratta e Vinci', value: 'gratta_e_vinci' },
          { name: 'Alcolici', value: 'alcolici' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('quantita')
        .setDescription('Quantità da rimuovere')
        .setRequired(true)
    )
    .toJSON()
);

// ============================================
// COMANDO: /annulla (Tutti)
// ============================================

commands.push(
  new SlashCommandBuilder()
    .setName('annulla')
    .setDescription('Annulla una fattura')
    .addStringOption(option =>
      option
        .setName('id_fattura')
        .setDescription('ID della fattura da annullare')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('motivo')
        .setDescription('Motivo dell\'annullamento')
        .setRequired(true)
    )
    .toJSON()
);

// ============================================
// COMANDO: /editfattura (Tutti con restrizioni)
// ============================================

commands.push(
  new SlashCommandBuilder()
    .setName('editfattura')
    .setDescription('Modifica una fattura')
    .addStringOption(option =>
      option
        .setName('id_fattura')
        .setDescription('ID della fattura da modificare')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('campo')
        .setDescription('Campo da modificare')
        .setRequired(true)
        .addChoices(
          { name: 'Articolo', value: 'vendita' },
          { name: 'Prezzo', value: 'prezzo' },
          { name: 'Stato', value: 'stato' }
        )
    )
    .addStringOption(option =>
      option
        .setName('valore')
        .setDescription('Nuovo valore')
        .setRequired(true)
    )
    .toJSON()
);

// ============================================
// FUNZIONE PER GESTIRE I COMANDI
// ============================================

async function handleCommands(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;
  const member = interaction.member;

  try {
    // ===== /menu =====
    if (command === 'menu') {
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

      // Pulsanti timbratura
      const btnTimbrareIn = new ButtonBuilder()
        .setCustomId('btn_timbrare_in')
        .setLabel('✅ Timbrare IN')
        .setStyle(ButtonStyle.Success);

      const btnTimbrareOut = new ButtonBuilder()
        .setCustomId('btn_timbrare_out')
        .setLabel('❌ Timbrare OUT')
        .setStyle(ButtonStyle.Danger);

      const btnInfo = new ButtonBuilder()
        .setCustomId('btn_info')
        .setLabel('📊 Info')
        .setStyle(ButtonStyle.Primary);

      const btnServizio = new ButtonBuilder()
        .setCustomId('btn_servizio')
        .setLabel('👥 Servizio')
        .setStyle(ButtonStyle.Primary);

      const row1 = new ActionRowBuilder().addComponents(btnTimbrareIn, btnTimbrareOut, btnInfo, btnServizio);

      const embed = createEmbed(
        '🎫 CARTELLINO - BOT GALAZY',
        '**Benvenuto Barista/Security/Ballerina**\n\nUtilizza i seguenti pulsanti per gestire la timbratura e le info.\n' +
        'Le vendite e il magazzino si gestiscono con i comandi `/registrovendite` e `/magazzino`.',
        '#FFD700'
      )
        .addFields(
          { name: '⏱️ Timbratura', value: 'Registra entrata e uscita dal servizio' },
          { name: '📊 Info', value: 'Visualizza le tue statistiche' },
          { name: '👥 Servizio', value: 'Vedi chi è attualmente in servizio' }
        );

      return interaction.reply({ embeds: [embed], components: [row1] });
    }

    // ===== /registrovendite =====
    if (command === 'registrovendite') {
      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

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
      return interaction.showModal(modal);
    }

    // ===== /magazzino =====
    if (command === 'magazzino') {
      const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
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
      return interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
    }

    // ===== /forzastop =====
    if (command === 'forzastop') {
      if (!hasAdminRole(member)) {
        const embed = createEmbed(
          '❌ Permesso Negato',
          'Solo Direttore e CEO possono usare questo comando',
          '#ff0000'
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const dipendente = interaction.options.getUser('dipendente');
      db.addTimbratura(dipendente.id, dipendente.username, dipendente.tag, 'STOP_FORZATO');

      const embed = createEmbed(
        '✅ Stop Forzato',
        `Timbratura forzata per ${dipendente} registrata.`,
        '#ff6600'
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ===== /aggiungiore =====
    if (command === 'aggiungiore') {
      if (!hasAdminRole(member)) {
        const embed = createEmbed(
          '❌ Permesso Negato',
          'Solo Direttore e CEO possono usare questo comando',
          '#ff0000'
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const dipendente = interaction.options.getUser('dipendente');
      const ore = interaction.options.getNumber('ore');

      // Simulazione aggiunta ore (in un sistema reale, lo aggiungeresti al database)
      const embed = createEmbed(
        '✅ Ore Aggiunte',
        `**${dipendente.username}** → +${ore} ore`,
        '#00ff00'
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ===== /togliore =====
    if (command === 'togliore') {
      if (!hasAdminRole(member)) {
        const embed = createEmbed(
          '❌ Permesso Negato',
          'Solo Direttore e CEO possono usare questo comando',
          '#ff0000'
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const dipendente = interaction.options.getUser('dipendente');
      const ore = interaction.options.getNumber('ore');

      const embed = createEmbed(
        '✅ Ore Tolte',
        `**${dipendente.username}** → -${ore} ore`,
        '#ff6600'
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ===== /riforniscimagazzino =====
    if (command === 'riforniscimagazzino') {
      if (!hasAdminRole(member)) {
        const embed = createEmbed(
          '❌ Permesso Negato',
          'Solo Direttore e CEO possono usare questo comando',
          '#ff0000'
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const prodotto = interaction.options.getString('prodotto');
      const quantita = interaction.options.getInteger('quantita');

      const nuovoStock = db.aggiungiStock(prodotto, quantita);

      const embed = createEmbed(
        '✅ Stock Aggiunto',
        `**${prodotto}** → +${quantita}\n**Nuovo stock:** ${nuovoStock}`,
        '#00ff00'
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ===== /levastock =====
    if (command === 'levastock') {
      if (!hasAdminRole(member)) {
        const embed = createEmbed(
          '❌ Permesso Negato',
          'Solo Direttore e CEO possono usare questo comando',
          '#ff0000'
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const prodotto = interaction.options.getString('prodotto');
      const quantita = interaction.options.getInteger('quantita');

      const nuovoStock = db.togliStock(prodotto, quantita);

      const embed = createEmbed(
        '✅ Stock Rimosso',
        `**${prodotto}** → -${quantita}\n**Nuovo stock:** ${nuovoStock}`,
        '#ff0000'
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ===== /annulla (Tutti) =====
    if (command === 'annulla') {
      const idFattura = interaction.options.getString('id_fattura');
      const motivo = interaction.options.getString('motivo');

      const fattura = db.getFattura(idFattura);
      if (!fattura) {
        const embed = createEmbed(
          '❌ Errore',
          'Fattura non trovata',
          '#ff0000'
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      db.updateFattura(idFattura, { stato: 'ANNULLATA', motivo_annullamento: motivo });

      const embed = createEmbed(
        '✅ Fattura Annullata',
        `**Fattura:** ${idFattura}\n**Motivo:** ${motivo}`,
        '#ff0000'
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ===== /editfattura (Con restrizioni) =====
    if (command === 'editfattura') {
      const idFattura = interaction.options.getString('id_fattura');
      const campo = interaction.options.getString('campo');
      const valore = interaction.options.getString('valore');

      const fattura = db.getFattura(idFattura);
      if (!fattura) {
        const embed = createEmbed(
          '❌ Errore',
          'Fattura non trovata',
          '#ff0000'
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // RESTRIZIONE: Solo chi ha creato la fattura può modificarla, a meno che non abbia 2 ruoli admin
      const isCreator = fattura.userId === interaction.user.id;
      const hasMultipleRoles = member.roles.cache.has(process.env.ID_RUOLO_DIRETTORE) && member.roles.cache.has(process.env.ID_RUOLO_CEO);
      const canEdit = isCreator || hasMultipleRoles;

      if (!canEdit) {
        const embed = createEmbed(
          '❌ Permesso Negato',
          'Non puoi modificare questa fattura. Solo il creatore o chi ha entrambi i ruoli admin può farlo.',
          '#ff0000'
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Aggiorna la fattura
      const updates = {};
      if (campo === 'vendita') updates.vendita = valore;
      if (campo === 'prezzo') updates.prezzo = parseFloat(valore);
      if (campo === 'stato') updates.stato = valore.toUpperCase();

      db.updateFattura(idFattura, updates);

      const embed = createEmbed(
        '✅ Fattura Modificata',
        `**Fattura:** ${idFattura}\n**Campo:** ${campo}\n**Nuovo valore:** ${valore}`,
        '#00ff00'
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Errore nel comando:', error);
    const embed = createEmbed(
      '❌ Errore',
      'Si è verificato un errore durante l\'esecuzione del comando',
      '#ff0000'
    );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

module.exports = { commands, handleCommands };
