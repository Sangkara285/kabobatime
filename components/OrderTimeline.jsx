import { statusLabel } from '@/lib/format';

export default function OrderTimeline({ mode, status }) {
  const steps = mode === 'antar'
    ? ['baru', 'diproses', 'siap', 'diantar', 'selesai']
    : ['baru', 'diproses', 'siap', 'selesai'];
  const currentIndex = steps.indexOf(status);

  return (
    <ol
      aria-label="Tahap pesanan"
      className={`relative grid ${mode === 'antar' ? 'grid-cols-5' : 'grid-cols-4'} gap-1 pt-1 before:absolute before:left-[10%] before:right-[10%] before:top-[17px] before:h-0.5 before:bg-line`}
    >
      {steps.map((step, index) => {
        const passed = currentIndex > index;
        const current = currentIndex === index;
        const label = { baru: 'Diterima', siap: 'Siap', diantar: 'Diantar' }[step] || statusLabel(step, mode);
        return (
          <li key={step} className="relative z-10 flex min-w-0 flex-col items-center gap-1.5 text-center" aria-current={current ? 'step' : undefined}>
            <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ring-4 ring-card ${passed ? 'bg-leaf-btn text-white' : current ? 'bg-brand text-white' : 'bg-paper text-ink-2 ring-1 ring-line'}`}>
              {passed ? '✓' : index + 1}
            </span>
            <span className={`max-w-full text-[10px] font-bold leading-tight sm:text-xs ${passed || current ? 'text-ink' : 'text-ink-2'}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
