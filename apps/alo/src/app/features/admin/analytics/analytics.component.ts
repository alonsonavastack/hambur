import { Component, inject, computed, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { FirebaseService } from '../../../core/services/firebase.service';
import { BrandService } from '../../../core/services/brand.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent {
  brand = inject(BrandService);
  private fb = inject(FirebaseService);
  private document = inject(DOCUMENT);

  startDate = signal<string>(this.formatDate(new Date()));
  endDate   = signal<string>(this.formatDate(new Date()));
  groupBy   = signal<'auto' | 'minutos' | 'horas' | 'dias'>('auto');

  onStartDate(e: Event)  { this.startDate.set((e.target as HTMLInputElement).value); }
  onEndDate(e: Event)    { this.endDate.set((e.target as HTMLInputElement).value); }
  onGroupBy(e: Event)    { this.groupBy.set((e.target as HTMLSelectElement).value as any); }

  filteredVisits = computed(() => {
    const visitas = this.fb.allVisitas();
    const start   = this.startDate();
    const end     = this.endDate();

    const dailyMap: Record<string, { count: number; history: number[] }> = {};

    visitas.forEach(v => {
      const ts      = v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp);
      const dateStr = this.formatDate(ts);
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { count: 0, history: [] };
      dailyMap[dateStr].count++;
      dailyMap[dateStr].history.push(ts.getTime());
    });

    return Object.entries(dailyMap)
      .map(([dateStr, data]) => ({ dateStr, count: data.count, history: data.history }))
      .filter(r => r.dateStr >= start && r.dateStr <= end)
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  });

  totalSelectedVisits = computed(() =>
    this.filteredVisits().reduce((sum, r) => sum + r.count, 0)
  );

  isSingleDay = computed(() => this.startDate() === this.endDate());

  chartData = computed<ChartConfiguration['data']>(() => {
    const records = this.filteredVisits();
    const mode    = this.groupBy() === 'auto' ? (this.isSingleDay() ? 'horas' : 'dias') : this.groupBy();

    if (mode === 'minutos') {
      const counts: Record<string, number> = {};
      records.forEach(r => r.history.forEach(ts => {
        const d   = new Date(ts);
        const lbl = this.isSingleDay()
          ? `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
          : `${this.formatDate(d)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        counts[lbl] = (counts[lbl] || 0) + 1;
      }));
      const labels = Object.keys(counts).sort();
      return { labels, datasets: [{ data: labels.map(l => counts[l]), label: 'Visitas (min)', ...this.datasetStyle() }] };

    } else if (mode === 'horas') {
      if (this.isSingleDay()) {
        const hourlyCounts = new Array(24).fill(0);
        records[0]?.history.forEach(ts => { hourlyCounts[new Date(ts).getHours()]++; });
        const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2,'0')}:00`);
        return { labels, datasets: [{ data: hourlyCounts, label: 'Visitas por hora', ...this.datasetStyle() }] };
      } else {
        const counts: Record<string, number> = {};
        records.forEach(r => r.history.forEach(ts => {
          const d   = new Date(ts);
          const lbl = `${this.formatDate(d)} ${String(d.getHours()).padStart(2,'0')}:00`;
          counts[lbl] = (counts[lbl] || 0) + 1;
        }));
        const labels = Object.keys(counts).sort();
        return { labels, datasets: [{ data: labels.map(l => counts[l]), label: 'Visitas por hora', ...this.datasetStyle() }] };
      }

    } else {
      const labels = records.map(r => r.dateStr);
      return { labels, datasets: [{ data: records.map(r => r.count), label: 'Visitas diarias', ...this.datasetStyle() }] };
    }
  });

  chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
  };

  chartType: ChartType = 'bar';

  private datasetStyle() {
    // Canvas no entiende var(--…): se leen los tokens del tema ya resueltos.
    const theme = getComputedStyle(this.document.documentElement);
    return {
      backgroundColor: `rgba(${theme.getPropertyValue('--neon-rgb').trim()}, 0.18)`,
      borderColor: theme.getPropertyValue('--neon').trim(),
      borderWidth: 2,
      fill: true,
      tension: 0.4
    };
  }

  private formatDate(d: Date): string {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
}
