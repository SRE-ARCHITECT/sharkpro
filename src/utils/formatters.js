// Utilitários para formatação de dados

export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00'
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(parseFloat(value))
}

export const formatCPF = (cpf) => {
  if (!cpf) return ''
  
  const cleanCPF = cpf.replace(/\D/g, '')
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export const formatPhone = (phone) => {
  if (!phone) return ''
  
  const cleanPhone = phone.replace(/\D/g, '')
  
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  
  return phone
}

export const formatCEP = (cep) => {
  if (!cep) return ''
  
  const cleanCEP = cep.replace(/\D/g, '')
  return cleanCEP.replace(/(\d{5})(\d{3})/, '$1-$2')
}

export const formatDate = (date) => {
  if (!date) return ''
  
  const dateObj = new Date(date + 'T00:00:00')
  return dateObj.toLocaleDateString('pt-BR')
}

export const formatDateTime = (datetime) => {
  if (!datetime) return ''
  
  const dateObj = new Date(datetime)
  return dateObj.toLocaleString('pt-BR')
}

export const parseCurrency = (currencyString) => {
  if (!currencyString) return 0
  
  return parseFloat(
    currencyString
      .replace(/[^\d,-]/g, '')
      .replace(',', '.')
  ) || 0
}

export const cleanCPF = (cpf) => {
  if (!cpf) return ''
  return cpf.replace(/\D/g, '')
}

export const cleanPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

export const cleanCEP = (cep) => {
  if (!cep) return ''
  return cep.replace(/\D/g, '')
}

export const validateCPF = (cpf) => {
  const cleanedCPF = cleanCPF(cpf)
  
  if (cleanedCPF.length !== 11) return false
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanedCPF)) return false
  
  // Validar dígitos verificadores
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanedCPF.charAt(i)) * (10 - i)
  }
  
  let remainder = 11 - (sum % 11)
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanedCPF.charAt(9))) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanedCPF.charAt(i)) * (11 - i)
  }
  
  remainder = 11 - (sum % 11)
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanedCPF.charAt(10))) return false
  
  return true
}

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const getStatusBadgeClass = (status) => {
  const statusClasses = {
    'ativo': 'status-ativo',
    'liquidado': 'status-liquidado',
    'pendente': 'status-pendente',
    'pago': 'status-pago',
    'atrasado': 'status-atrasado'
  }
  
  return statusClasses[status] || 'status-pendente'
}

export const getStatusText = (status) => {
  const statusTexts = {
    'ativo': 'Ativo',
    'liquidado': 'Liquidado',
    'pendente': 'Pendente',
    'pago': 'Pago',
    'atrasado': 'Atrasado'
  }
  
  return statusTexts[status] || status
}