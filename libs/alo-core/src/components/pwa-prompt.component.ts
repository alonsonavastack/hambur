import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pwa-prompt',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showPrompt()) {
      <div style="
        position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
        width:calc(100% - 40px); max-width:400px;
        background:rgba(26,10,31,0.95);
        backdrop-filter:blur(10px);
        border:1px solid rgba(192,38,211,0.5);
        border-radius:16px;
        padding:1rem;
        box-shadow:0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(192,38,211,0.2);
        z-index:9999;
        display:flex; flex-direction:column; gap:0.8rem;
        animation:slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      ">
        <style>
          @keyframes slideUp {
            from { opacity:0; transform:translate(-50%, 40px); }
            to { opacity:1; transform:translate(-50%, 0); }
          }
        </style>
        
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="display:flex; gap:0.8rem; align-items:center;">
            <img src="/fresasconcrema.png" alt="App Icon" style="width:40px; height:40px; border-radius:10px; object-fit:cover;" />
            <div>
              <h4 style="margin:0; font-family:'Cinzel',serif; color:var(--neon-light); font-size:1rem;">Instala Fresas ALO</h4>
              <p style="margin:0; font-size:0.8rem; color:var(--texto-secondary);">Accede más rápido desde tu pantalla de inicio.</p>
            </div>
          </div>
          <button (click)="close()" style="background:none; border:none; color:var(--texto-secondary); font-size:1.2rem; cursor:pointer; padding:0 0.2rem;">&times;</button>
        </div>

        <button (click)="install()" style="
          width:100%; padding:0.7rem;
          background:linear-gradient(135deg,var(--neon-dark),var(--neon));
          color:white; border:none; border-radius:10px;
          font-family:'Nunito',sans-serif; font-weight:700; font-size:0.95rem;
          cursor:pointer; transition:transform 0.2s;
        " onactive="this.style.transform='scale(0.98)'">
          Instalar Aplicación
        </button>
      </div>
    }

    @if (installedSuccess()) {
      <div style="
        position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
        background:#4ade80; color:#064e3b;
        padding:0.8rem 1.5rem; border-radius:30px;
        font-family:'Nunito',sans-serif; font-weight:800; font-size:0.95rem;
        box-shadow:0 10px 30px rgba(74,222,128,0.4);
        z-index:10000; display:flex; align-items:center; gap:0.5rem;
        animation:slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        white-space:nowrap;
      ">
        <span>✅</span> ¡Aplicación instalada con éxito!
      </div>
    }
  `
})
export class PwaPromptComponent implements OnInit {
  showPrompt = signal(false);
  installedSuccess = signal(false);
  private deferredPrompt: any;

  ngOnInit() {
    // Si ya estamos en modo standalone (ya instalada), no mostrar nunca
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      return;
    }
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onbeforeinstallprompt(e: Event) {
    // Evitar que Chrome muestre el mini-infobar por defecto
    e.preventDefault();
    // Guardar el evento para poder llamarlo luego
    this.deferredPrompt = e;
    // Mostrar nuestro banner amigable
    this.showPrompt.set(true);
  }

  @HostListener('window:appinstalled')
  onappinstalled() {
    // Si la app fue instalada con éxito, ocultamos el banner y mostramos éxito
    this.showPrompt.set(false);
    this.deferredPrompt = null;
    this.installedSuccess.set(true);
    setTimeout(() => this.installedSuccess.set(false), 4000);
  }

  install() {
    this.showPrompt.set(false);
    if (this.deferredPrompt) {
      // Mostrar el prompt nativo
      this.deferredPrompt.prompt();
      // Esperar a ver qué responde el usuario
      this.deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('El usuario aceptó instalar la PWA');
        } else {
          console.log('El usuario rechazó la instalación de la PWA');
        }
        this.deferredPrompt = null;
      });
    }
  }

  close() {
    this.showPrompt.set(false);
    this.deferredPrompt = null;
  }
}
