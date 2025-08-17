import { supabase } from '../config/supabase.js'

export class AuthService {
  constructor() {
    this.currentUser = null
    this.currentProfile = null
    this.isInitialized = false
  }

  async initialize() {
    try {
      // Verificar sessão existente
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Erro ao verificar sessão:', error)
        return false
      }

      if (session?.user) {
        this.currentUser = session.user
        await this.loadUserProfile()
        this.isInitialized = true
        return true
      }

      this.isInitialized = true
      return false
    } catch (error) {
      console.error('Erro na inicialização do auth:', error)
      this.isInitialized = true
      return false
    }
  }

  async loadUserProfile() {
    if (!this.currentUser) return null

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', this.currentUser.id)
        .single()

      if (error) {
        console.error('Erro ao carregar perfil:', error)
        return null
      }

      this.currentProfile = data
      return data
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error)
      return null
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (error) {
        throw new Error(this.getAuthErrorMessage(error))
      }

      this.currentUser = data.user
      await this.loadUserProfile()
      
      return { success: true, user: data.user }
    } catch (error) {
      console.error('Erro no login:', error)
      return { success: false, error: error.message }
    }
  }

  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: userData
        }
      })

      if (error) {
        throw new Error(this.getAuthErrorMessage(error))
      }

      return { success: true, user: data.user }
    } catch (error) {
      console.error('Erro no cadastro:', error)
      return { success: false, error: error.message }
    }
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw new Error(error.message)
      }

      this.currentUser = null
      this.currentProfile = null
      
      return { success: true }
    } catch (error) {
      console.error('Erro no logout:', error)
      return { success: false, error: error.message }
    }
  }

  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
      
      if (error) {
        throw new Error(this.getAuthErrorMessage(error))
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao resetar senha:', error)
      return { success: false, error: error.message }
    }
  }

  async updateProfile(updates) {
    if (!this.currentUser) {
      return { success: false, error: 'Usuário não autenticado' }
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', this.currentUser.id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      this.currentProfile = data
      return { success: true, profile: data }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      return { success: false, error: error.message }
    }
  }

  async createUser(email, password) {
    if (!this.isAdmin()) {
      return { success: false, error: 'Acesso negado. Apenas administradores podem criar usuários.' }
    }

    try {
      // Usar a API Admin do Supabase (requer service role key)
      const { data, error } = await supabase.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true
      })

      if (error) {
        throw new Error(this.getAuthErrorMessage(error))
      }

      return { success: true, user: data.user }
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      return { success: false, error: error.message }
    }
  }

  async toggleUserBlock(userId, blocked) {
    if (!this.isAdmin()) {
      return { success: false, error: 'Acesso negado' }
    }

    try {
      const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: blocked ? '876000h' : 'none' // ~100 anos para "permanente"
      })

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, user: data.user }
    } catch (error) {
      console.error('Erro ao bloquear/desbloquear usuário:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteUser(userId) {
    if (!this.isAdmin()) {
      return { success: false, error: 'Acesso negado' }
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId)

      if (error) {
        throw new Error(error.message)
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      return { success: false, error: error.message }
    }
  }

  async listUsers() {
    if (!this.isAdmin()) {
      return { success: false, error: 'Acesso negado' }
    }

    try {
      const { data, error } = await supabase.auth.admin.listUsers()

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, users: data.users }
    } catch (error) {
      console.error('Erro ao listar usuários:', error)
      return { success: false, error: error.message }
    }
  }

  // Listeners para mudanças de autenticação
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.currentUser = session.user
        await this.loadUserProfile()
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null
        this.currentProfile = null
      }
      
      callback(event, session)
    })
  }

  // Getters
  isAuthenticated() {
    return !!this.currentUser
  }

  isAdmin() {
    return this.currentProfile?.is_admin === true
  }

  getCurrentUser() {
    return this.currentUser
  }

  getCurrentProfile() {
    return this.currentProfile
  }

  // Utilitários
  getAuthErrorMessage(error) {
    const errorMessages = {
      'Invalid login credentials': 'Email ou senha incorretos',
      'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
      'User already registered': 'Este email já está cadastrado',
      'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
      'Unable to validate email address: invalid format': 'Formato de email inválido',
      'signup_disabled': 'Cadastro desabilitado pelo administrador'
    }

    return errorMessages[error.message] || error.message || 'Erro desconhecido'
  }
}

// Instância singleton
export const authService = new AuthService()