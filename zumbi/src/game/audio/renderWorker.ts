/**
 * Gera variações de som fora da linha principal (o jogo não engasga enquanto
 * o som mais pesado é calculado). Mesmas receitas e sementes: o resultado é
 * idêntico ao gerado na linha principal.
 */
import { Rng } from './dsp';
import { soundDef, variantSeed } from './SoundCatalog';

interface Job {
  id: string;
  v: number;
}

self.onmessage = (e: MessageEvent<Job>) => {
  const { id, v } = e.data;
  const d = soundDef(id);
  if (!d) {
    self.postMessage({ id, v, data: null });
    return;
  }
  const data = d.make(new Rng(variantSeed(id, v)), d.sr);
  (self as unknown as Worker).postMessage({ id, v, data }, [data.buffer]);
};
