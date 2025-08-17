// Sistema de notificações toast

export class ToastManager {
  constructor() {
    this.toastElement = null
    this.init()
  }

  init() {
    // Buscar elemento toast existente ou criar um novo
    this.toastElement = document.getElementById('toast')
    
    if (!this.toastElement) {
      this.toastElement = document.createElement('div')
      this.toastElement.id = 'toast'
      this.toastElement.className = 'toast'
      document.body.appendChild(this.toastElement)
    }
  }

  show(message, type = 'info', duration = 4000) {
    if (!this.toastElement) {
      this.init()
    }

    // Limpar classes anteriores
    this.toastElement.className = 'toast'
    
    // Adicionar classe do tipo
    this.toastElement.classList.add(`toast-${type}`)
    
    // Definir mensagem
    this.toastElement.textContent = message
    
    // Mostrar toast
    this.toastElement.classList.add('show')
    
    // Ocultar após duração especificada
    setTimeout(() => {
      this.hide()
    }, duration)
  }

  hide() {
    if (this.toastElement) {
      this.toastElement.classList.remove('show')
    }
  }

  success(message, duration = 4000) {
    this.show(message, 'success', duration)
  }

  error(message, duration = 6000) {
    this.show(message, 'error', duration)
  }

  warning(message, duration = 5000) {
    this.show(message, 'warning', duration)
  }

  info(message, duration = 4000) {
    this.show(message, 'info', duration)
  }
}

// Instância singleton
export const toast = new ToastManager()