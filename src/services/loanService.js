import { supabase } from '../config/supabase.js'
import { authService } from './authService.js'

export class LoanService {
  async createLoan(loanData) {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Usuário não autenticado')
      }

      // Calcular valores do empréstimo
      const calculations = this.calculateLoanValues(
        loanData.amount,
        loanData.interest_rate,
        loanData.installments_count
      )

      const loanToInsert = {
        ...loanData,
        total_value: calculations.totalValue,
        installment_value: calculations.installmentValue,
        owner_id: authService.getCurrentUser().id
      }

      // Inserir empréstimo
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .insert([loanToInsert])
        .select()
        .single()

      if (loanError) {
        throw new Error(loanError.message)
      }

      // Criar parcelas
      const payments = this.generatePayments(
        loan.id,
        loanData.installments_count,
        calculations.installmentValue,
        loanData.first_due_date
      )

      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(payments)

      if (paymentsError) {
        // Se falhar ao criar parcelas, excluir o empréstimo
        await supabase.from('loans').delete().eq('id', loan.id)
        throw new Error(paymentsError.message)
      }

      return { success: true, loan }
    } catch (error) {
      console.error('Erro ao criar empréstimo:', error)
      return { success: false, error: error.message }
    }
  }

  async updateLoan(loanId, updates) {
    try {
      const { data, error } = await supabase
        .from('loans')
        .update(updates)
        .eq('id', loanId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, loan: data }
    } catch (error) {
      console.error('Erro ao atualizar empréstimo:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteLoan(loanId) {
    try {
      // As parcelas serão excluídas automaticamente devido ao CASCADE
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanId)

      if (error) {
        throw new Error(error.message)
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir empréstimo:', error)
      return { success: false, error: error.message }
    }
  }

  async getLoan(loanId) {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select(`
          *,
          clients (*),
          payments (*)
        `)
        .eq('id', loanId)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, loan: data }
    } catch (error) {
      console.error('Erro ao buscar empréstimo:', error)
      return { success: false, error: error.message }
    }
  }

  async getLoans(filters = {}) {
    try {
      let query = supabase
        .from('loans')
        .select(`
          *,
          clients (id, name, cpf),
          payments (id, status, due_date)
        `)
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filters.clientCpf) {
        query = query.eq('clients.cpf', filters.clientCpf.replace(/\D/g, ''))
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
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
        loans: data || [],
        total: count
      }
    } catch (error) {
      console.error('Erro ao buscar empréstimos:', error)
      return { success: false, error: error.message }
    }
  }

  async getLoansByClientCPF(cpf) {
    try {
      const cleanCPF = cpf.replace(/\D/g, '')
      
      const { data, error } = await supabase
        .from('loans')
        .select(`
          *,
          clients (*),
          payments (*)
        `)
        .eq('clients.cpf', cleanCPF)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, loans: data || [] }
    } catch (error) {
      console.error('Erro ao buscar empréstimos por CPF:', error)
      return { success: false, error: error.message }
    }
  }

  async updatePaymentStatus(paymentId, status, paidAt = null) {
    try {
      const updates = { status }
      if (paidAt) {
        updates.paid_at = paidAt
      }

      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', paymentId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Verificar se todas as parcelas foram pagas para atualizar status do empréstimo
      await this.updateLoanStatusIfComplete(data.loan_id)

      return { success: true, payment: data }
    } catch (error) {
      console.error('Erro ao atualizar status do pagamento:', error)
      return { success: false, error: error.message }
    }
  }

  async updateLoanStatusIfComplete(loanId) {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('status')
        .eq('loan_id', loanId)

      if (error) {
        throw new Error(error.message)
      }

      const allPaid = payments.every(payment => payment.status === 'pago')
      
      if (allPaid) {
        await supabase
          .from('loans')
          .update({ status: 'liquidado' })
          .eq('id', loanId)
      }
    } catch (error) {
      console.error('Erro ao atualizar status do empréstimo:', error)
    }
  }

  async calculateOverdueInterest(paymentId) {
    try {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          loans (mora_interest_rate, late_fee_rate)
        `)
        .eq('id', paymentId)
        .single()

      if (paymentError) {
        throw new Error(paymentError.message)
      }

      const today = new Date()
      const dueDate = new Date(payment.due_date)
      
      if (dueDate >= today || payment.status === 'pago') {
        return { success: true, interest: 0, fee: 0, total: payment.amount }
      }

      const diffDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24))
      const loan = payment.loans

      // Juros de mora compostos diários
      const moraInterest = payment.amount * (Math.pow(1 + loan.mora_interest_rate/100, diffDays) - 1)
      
      // Multa fixa
      const lateFee = payment.amount * (loan.late_fee_rate / 100)
      
      const total = payment.amount + moraInterest + lateFee

      // Atualizar o pagamento com os valores calculados
      await supabase
        .from('payments')
        .update({
          mora_interest_applied: moraInterest,
          late_fee_applied: lateFee,
          status: 'atrasado'
        })
        .eq('id', paymentId)

      return { 
        success: true, 
        interest: moraInterest, 
        fee: lateFee, 
        total,
        days: diffDays
      }
    } catch (error) {
      console.error('Erro ao calcular juros de mora:', error)
      return { success: false, error: error.message }
    }
  }

  async getDashboardStats() {
    try {
      const userId = authService.getCurrentUser()?.id
      if (!userId) {
        throw new Error('Usuário não autenticado')
      }

      // Buscar estatísticas em paralelo
      const [clientsResult, loansResult, paymentsResult] = await Promise.all([
        // Total de clientes
        supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('owner_id', userId),
        
        // Empréstimos ativos
        supabase
          .from('loans')
          .select('id, total_value', { count: 'exact' })
          .eq('owner_id', userId)
          .eq('status', 'ativo'),
        
        // Pagamentos pendentes/atrasados
        supabase
          .from('payments')
          .select(`
            id, 
            due_date, 
            amount,
            loans!inner (owner_id)
          `, { count: 'exact' })
          .eq('loans.owner_id', userId)
          .in('status', ['pendente', 'atrasado'])
      ])

      if (clientsResult.error || loansResult.error || paymentsResult.error) {
        throw new Error('Erro ao buscar estatísticas')
      }

      // Calcular cobranças pendentes (pagamentos em atraso)
      const today = new Date()
      const overduePayments = paymentsResult.data?.filter(payment => 
        new Date(payment.due_date) < today
      ) || []

      // Calcular valor total em aberto
      const totalOutstanding = loansResult.data?.reduce((sum, loan) => 
        sum + parseFloat(loan.total_value || 0), 0
      ) || 0

      return {
        success: true,
        stats: {
          totalClients: clientsResult.count || 0,
          activeLoans: loansResult.count || 0,
          pendingCollections: overduePayments.length,
          totalOutstanding
        }
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error)
      return { success: false, error: error.message }
    }
  }

  // Utilitários
  calculateLoanValues(amount, interestRate, installments) {
    const monthlyRate = interestRate / 100
    const totalValue = amount * (1 + monthlyRate) * installments
    const installmentValue = totalValue / installments

    return {
      totalValue: Math.round(totalValue * 100) / 100,
      installmentValue: Math.round(installmentValue * 100) / 100
    }
  }

  generatePayments(loanId, installments, installmentValue, firstDueDate) {
    const payments = []
    const startDate = new Date(firstDueDate)

    for (let i = 1; i <= installments; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + (i - 1))

      payments.push({
        loan_id: loanId,
        installment_number: i,
        due_date: dueDate.toISOString().split('T')[0],
        amount: installmentValue,
        status: 'pendente'
      })
    }

    return payments
  }
}

export const loanService = new LoanService()