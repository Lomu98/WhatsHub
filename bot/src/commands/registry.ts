import { aggiungiCommand } from './builtin/aggiungi.command';
import { citCommand } from './builtin/cit.command';
import { compleanniCommand } from './builtin/compleanni.command';
import { compleannoCommand } from './builtin/compleanno.command';
import { eventiCommand } from './builtin/eventi.command';
import { eventoCommand } from './builtin/evento.command';
import { helpCommand } from './builtin/help.command';
import { listaCommand } from './builtin/lista.command';
import { presoCommand } from './builtin/preso.command';
import { svuotaCommand } from './builtin/svuota.command';
import type { Command } from './types';

/**
 * Ordine = ordine in cui compaiono in `!help`.
 * Attenzione: `compleanno` prima di `compleanni` non conta, la risoluzione è
 * per chiave esatta nella mappa qui sotto.
 */
const COMMANDS: Command[] = [
  aggiungiCommand,
  listaCommand,
  presoCommand,
  svuotaCommand,
  compleanniCommand,
  compleannoCommand,
  eventiCommand,
  eventoCommand,
  citCommand,
  helpCommand,
];

/** Mappa nome/alias -> comando, costruita una volta sola all'import. */
const LOOKUP = new Map<string, Command>();
for (const command of COMMANDS) {
  LOOKUP.set(command.name.toLowerCase(), command);
  for (const alias of command.aliases ?? []) {
    LOOKUP.set(alias.toLowerCase(), command);
  }
}

export function getBuiltinCommands(): Command[] {
  return COMMANDS;
}

export function findBuiltinCommand(trigger: string): Command | undefined {
  return LOOKUP.get(trigger.toLowerCase());
}

export function isBuiltinTrigger(trigger: string): boolean {
  return LOOKUP.has(trigger.toLowerCase());
}
