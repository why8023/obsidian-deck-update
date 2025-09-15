import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface DeckUpdaterSettings {
  includeFilename: boolean; // true -> include filename in deck path
}

const DEFAULT_SETTINGS: DeckUpdaterSettings = {
  includeFilename: false,
};

export default class DeckAutoUpdater extends Plugin {
  settings: DeckUpdaterSettings;

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Handle new file creation
    this.registerEvent(
      this.app.vault.on('create', async (file) => {
        if (!(file instanceof TFile) || file.extension !== 'md') return;
        await this.updateDeckFrontmatter(file);
      })
    );

    // Handle move/rename
    this.registerEvent(
      this.app.vault.on('rename', async (file) => {
        if (!(file instanceof TFile) || file.extension !== 'md') return;
        await this.updateDeckFrontmatter(file);
      })
    );

    this.addSettingTab(new DeckUpdaterSettingTab(this.app, this));
  }

  private buildDeckPath(file: TFile): string {
    // Normalize path to forward slashes and strip .md
    const rel = file.path.replace(/\\/g, '/').replace(/\.md$/i, '');
    const parts = rel.split('/').filter(Boolean);

    const effectiveParts = this.settings.includeFilename
      ? parts
      : parts.slice(0, -1); // folders only

    const base = 'obsidian_sync';
    return effectiveParts.length ? `${base}::${effectiveParts.join('::')}` : base;
  }

  private async updateDeckFrontmatter(file: TFile) {
    const deck = this.buildDeckPath(file);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm['TARGET DECK'] = deck;
    });
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class DeckUpdaterSettingTab extends PluginSettingTab {
  plugin: DeckAutoUpdater;

  constructor(app: App, plugin: DeckAutoUpdater) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Include filename in deck path')
      .setDesc(
        'On: obsidian_sync::<folders>::<filename>. Off: obsidian_sync::<folders>'
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeFilename)
          .onChange(async (value) => {
            this.plugin.settings.includeFilename = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
