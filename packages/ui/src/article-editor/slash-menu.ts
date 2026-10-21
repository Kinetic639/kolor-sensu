import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";
import { matchCommands, type ArticleBlockCommand } from "./commands";

// The "/" menu: typing "/" (then a few letters: "/zdj") lists what can be
// inserted; Enter inserts it in place of what was typed. The list itself is
// drawn by the editor component, which the handlers below reach.

export interface SlashMenuHandlers {
  show: (
    props: SuggestionProps<ArticleBlockCommand, ArticleBlockCommand>,
  ) => void;
  keyDown: (event: KeyboardEvent) => boolean;
  hide: () => void;
}

export interface SlashMenuOptions {
  commands: readonly ArticleBlockCommand[];
  /**
   * The editor component's current handlers. A function, not an object:
   * configure() copies objects, which would keep the first render's.
   */
  handlers: () => SlashMenuHandlers | null;
}

export const SlashMenu = Extension.create<SlashMenuOptions>({
  name: "slashMenu",
  addOptions: () => ({ commands: [], handlers: () => null }),
  addProseMirrorPlugins() {
    const { commands, handlers } = this.options;
    return [
      Suggestion<ArticleBlockCommand, ArticleBlockCommand>({
        editor: this.editor,
        char: "/",
        pluginKey: new PluginKey("slashMenu"),
        items: ({ query }) => matchCommands(commands, query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => ({
          onStart: (props) => handlers()?.show(props),
          onUpdate: (props) => handlers()?.show(props),
          onKeyDown: ({ event }) => handlers()?.keyDown(event) ?? false,
          onExit: () => handlers()?.hide(),
        }),
      }),
    ];
  },
});
