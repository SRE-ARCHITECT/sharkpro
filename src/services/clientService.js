import { supabase } from '../config/supabase.js'
import { authService } from './authService.js'

export class ClientService {
  async createClient(clientData) {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado')
      }

      const { data, error } = await supabase
        .from('clients')
        .insert([{
          ...clientData,
          owner_id: authService.getCurrentUser().id
        }])
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, client: data }
    } catch (error) {
      console.error('Erro ao criar cliente:', error)
      return { success: false, error: error.message }
    }
  }

  async updateClient(clientId, updates) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, client: data }
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteClient(clientId) {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)

      if (error) {
        throw new Error(error.message)
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      return { success: false, error: error.message }
    }
  }

  async getClient(clientId) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, client: data }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error)
      return { success: false, error: error.message }
    }
  }

  async getClients(filters = {}) {
    try {
      let query = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filters.cpf) {
        query = query.ilike('cpf', `%${filters.cpf}%`)
      }

      if (filters.name) {
        query = query.ilike('name', `%${filters.name}%`)
      }

      // Paginação
      if (filters.page && filters.limit) {
        const from = (filters.page - 1) * filters.limit
        const to = from + filters.limit - 1
        query = query.range(from, to)
      }

      const { data, error, count } = await query

      if (error) {
        throw new Error(error.message)
      }

      return { 
        success: true, 
        clients: data || [],
        total: count
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
      return { success: false, error: error.message }
    }
  }

  async searchClientByCPF(cpf) {
    try {
      const cleanCPF = cpf.replace(/\D/g, '')
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('cpf', cleanCPF)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(error.message)
      }

      return { 
        success: true, 
        client: data || null 
      }
    } catch (error) {
      console.error('Erro ao buscar cliente por CPF:', error)
      return { success: false, error: error.message }
    }
  }

  async getClientsWithLoans() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          loans (
            id,
            status,
            amount,
            total_value,
            payments (
              status,
              due_date
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      // Processar dados para incluir informações de status
      const clientsWithStatus = data.map(client => {
        const hasActiveLoans = client.loans.some(loan => loan.status === 'ativo')
        const hasOverduePayments = client.loans.some(loan => 
          loan.payments.some(payment => 
            payment.status === 'pendente' && 
            new Date(payment.due_date) < new Date()
          )
        )

        return {
          ...client,
          hasActiveLoans,
          hasOverduePayments,
          status: hasOverduePayments ? 'atrasado' : hasActiveLoans ? 'ativo' : 'sem_emprestimos'
        }
      })

      return { 
        success: true, 
        clients: clientsWithStatus 
      }
    } catch (error) {
      console.error('Erro ao buscar clientes com empréstimos:', error)
      return { success: false, error: error.message }
    }
  }

  async uploadDocument(clientId, file, fileName) {
    try {
      const filePath = `${clientId}/${fileName}`
      
      const { data, error } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, path: data.path }
    } catch (error) {
      console.error('Erro ao fazer upload do documento:', error)
      return { success: false, error: error.message }
    }
  }

  async getDocumentUrl(clientId, fileName) {
    try {
      const filePath = `${clientId}/${fileName}`
      
      const { data, error } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(filePath, 3600) // 1 hora

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, url: data.signedUrl }
    } catch (error) {
      console.error('Erro ao obter URL do documento:', error)
      return { success: false, error: error.message }
    }
  }

  async listDocuments(clientId) {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .list(clientId)

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, documents: data || [] }
    } catch (error) {
      console.error('Erro ao listar documentos:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteDocument(clientId, fileName) {
    try {
      const filePath = `${clientId}/${fileName}`
      
      const { error } = await supabase.storage
        .from('client-documents')
        .remove([filePath])

      if (error) {
        throw new Error(error.message)
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir documento:', error)
      return { success: false, error: error.message }
    }
  }
}

export const clientService = new ClientService()