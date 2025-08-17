// Nova versão do app.js integrada com Supabase
import { authService } from './services/authService.js'
import { clientService } from './services/clientService.js'
import { loanService } from './services/loanService.js'
import { toast } from './utils/toast.js'
import { 
  formatCurrency, 
  formatCPF, 
  formatPhone, 
  formatDate,
  cleanCPF,
  validateCPF,
  validateEmail,
  getStatusBadgeClass,
  getStatusText
} from './utils/formatters.js'

class SharkProApp {
  constructor() {
    this.currentView = 'dashboard-view'
    this.clients = []
    this.loans = []
    this.isLoading = false
    
    this.init()
  }

  async init() {
    try {
      // Mostrar loading
      this.showLoading()
      
      // Inicializar autenticação
      const isAuthenticated = await authService.initialize()
      
      if (!isAuthenticated) {
        this.showLoginScreen()
        return
      }

      // Usuário autenticado - mostrar app
      this.showMainContent()
      await this.loadInitialData()
      this.setupEventListeners()
      this.setupAuthStateListener()
      
    } catch (error) {
      console.error('Erro na inicialização:', error)
      toast.error('Erro ao inicializar aplicação')
      this.showLoginScreen()
    } finally {
      this.hideLoading()
    }
  }

  showLoading() {
    // Implementar indicador de loading se necessário
    this.isLoading = true
  }

  hideLoading() {
    this.isLoading = false
  }

  showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex'
    document.getElementById('mainContent').style.display = 'none'
  }

  showMainContent() {
    document.getElementById('loginScreen').style.display = 'none'
    document.getElementById('mainContent').style.display = 'block'
    
    // Mostrar/ocultar botão de admin
    const adminButton = document.getElementById('adminButton')
    if (adminButton) {
      adminButton.style.display = authService.isAdmin() ? 'block' : 'none'
    }
  }

  async loadInitialData() {
    try {
      // Carregar dados do dashboard
      await this.loadDashboardData()
      
      // Carregar dados da view atual
      await this.loadCurrentViewData()
      
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
      toast.error('Erro ao carregar dados')
    }
  }

  async loadDashboardData() {
    try {
      const result = await loanService.getDashboardStats()
      
      if (result.success) {
        this.updateDashboardStats(result.stats)
      }

      // Carregar clientes com empréstimos para a tabela
      const clientsResult = await clientService.getClientsWithLoans()
      
      if (clientsResult.success) {
        this.renderPendingDebtsTable(clientsResult.clients)
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    }
  }

  updateDashboardStats(stats) {
    document.getElementById('total-clients-stat').textContent = stats.totalClients
    document.getElementById('active-loans-stat').textContent = stats.activeLoans
    document.getElementById('pending-collections-stat').textContent = stats.pendingCollections
    document.getElementById('total-outstanding-stat').textContent = formatCurrency(stats.totalOutstanding)
  }

  renderPendingDebtsTable(clients) {
    const tbody = document.getElementById('pending-debts-table-body')
    
    if (!tbody) return

    tbody.innerHTML = ''

    if (clients.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="empty-state">
            Nenhum cliente encontrado
          </td>
        </tr>
      `
      return
    }

    clients.forEach(client => {
      const row = document.createElement('tr')
      
      let statusIcon = '✅'
      let statusClass = 'status-ativo'
      
      if (client.hasOverduePayments) {
        statusIcon = '⚠️'
        statusClass = 'status-atrasado'
      } else if (!client.hasActiveLoans) {
        statusIcon = '⭕'
        statusClass = 'status-liquidado'
      }

      row.innerHTML = `
        <td>
          <span class="status-badge ${statusClass}">
            ${statusIcon}
          </span>
        </td>
        <td>${client.name}</td>
        <td>${formatCPF(client.cpf)}</td>
      `
      
      tbody.appendChild(row)
    })
  }

  async loadCurrentViewData() {
    switch (this.currentView) {
      case 'clients-view':
        await this.loadClientsView()
        break
      case 'loans-view':
        await this.loadLoansView()
        break
      default:
        // Dashboard já foi carregado
        break
    }
  }

  async loadClientsView() {
    try {
      const result = await clientService.getClients()
      
      if (result.success) {
        this.clients = result.clients
        this.renderClientsTable()
      } else {
        toast.error('Erro ao carregar clientes')
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      toast.error('Erro ao carregar clientes')
    }
  }

  async loadLoansView() {
    try {
      const result = await loanService.getLoans()
      
      if (result.success) {
        this.loans = result.loans
        this.renderLoansTable()
      } else {
        toast.error('Erro ao carregar empréstimos')
      }
    } catch (error) {
      console.error('Erro ao carregar empréstimos:', error)
      toast.error('Erro ao carregar empréstimos')
    }
  }

  renderClientsTable() {
    const clientsView = document.getElementById('clients-view')
    const existingTable = clientsView.querySelector('.table-container')
    
    if (existingTable) {
      existingTable.remove()
    }

    if (this.clients.length === 0) {
      const emptyState = document.createElement('div')
      emptyState.className = 'empty-state'
      emptyState.innerHTML = `
        <p>Nenhum cliente cadastrado ainda.</p>
        <button class="btn primary-btn" onclick="app.openClientModal()">
          Cadastrar Primeiro Cliente
        </button>
      `
      clientsView.appendChild(emptyState)
      return
    }

    const tableContainer = document.createElement('div')
    tableContainer.className = 'table-container'
    
    tableContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>CPF</th>
            <th>Telefone</th>
            <th>Cidade</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${this.clients.map(client => `
            <tr>
              <td>${client.name}</td>
              <td>${formatCPF(client.cpf)}</td>
              <td>${formatPhone(client.phone)}</td>
              <td>${client.city || 'Não informado'}</td>
              <td class="action-cell">
                <button class="btn info-btn" onclick="app.editClient('${client.id}')">
                  Editar
                </button>
                <button class="btn secondary-btn" onclick="app.generateClientReport('${client.id}')">
                  Relatório
                </button>
                ${authService.isAdmin() ? `
                  <button class="btn danger-btn" onclick="app.deleteClient('${client.id}')">
                    Excluir
                  </button>
                ` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    
    clientsView.appendChild(tableContainer)
  }

  renderLoansTable() {
    const loansView = document.getElementById('loans-view')
    const existingTable = loansView.querySelector('.table-container')
    
    if (existingTable) {
      existingTable.remove()
    }

    if (this.loans.length === 0) {
      const emptyState = document.createElement('div')
      emptyState.className = 'empty-state'
      emptyState.innerHTML = `
        <p>Nenhum empréstimo registrado ainda.</p>
        <button class="btn primary-btn" onclick="app.openLoanModal()">
          Registrar Primeiro Empréstimo
        </button>
      `
      loansView.appendChild(emptyState)
      return
    }

    const tableContainer = document.createElement('div')
    tableContainer.className = 'table-container'
    
    tableContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>CPF</th>
            <th>Valor</th>
            <th>Parcelas</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${this.loans.map(loan => `
            <tr>
              <td>${loan.clients?.name || 'Cliente não encontrado'}</td>
              <td>${formatCPF(loan.clients?.cpf || '')}</td>
              <td>${formatCurrency(loan.total_value)}</td>
              <td>${loan.installments_count}</td>
              <td>
                <span class="status-badge ${getStatusBadgeClass(loan.status)}">
                  ${getStatusText(loan.status)}
                </span>
              </td>
              <td class="action-cell">
                <button class="btn info-btn" onclick="app.viewLoanDetails('${loan.id}')">
                  Detalhes
                </button>
                <button class="btn warning-btn" onclick="app.editLoan('${loan.id}')">
                  Editar
                </button>
                ${authService.isAdmin() ? `
                  <button class="btn danger-btn" onclick="app.deleteLoan('${loan.id}')">
                    Excluir
                  </button>
                ` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    
    loansView.appendChild(tableContainer)
  }

  setupEventListeners() {
    // Login
    document.getElementById('loginButton')?.addEventListener('click', () => this.handleLogin())
    document.getElementById('logoutButton')?.addEventListener('click', () => this.handleLogout())
    
    // Navegação por abas
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const viewId = e.target.dataset.view
        this.switchView(viewId)
      })
    })

    // Botões principais
    document.getElementById('add-client-btn')?.addEventListener('click', () => this.openClientModal())
    document.getElementById('add-loan-btn')?.addEventListener('click', () => this.openLoanModal())
    
    // Modais
    this.setupModalEventListeners()
    
    // Busca
    this.setupSearchEventListeners()
    
    // Dark mode
    document.getElementById('darkModeToggle')?.addEventListener('click', () => this.toggleDarkMode())
    
    // Admin
    document.getElementById('adminButton')?.addEventListener('click', () => this.openAdminModal())
  }

  setupModalEventListeners() {
    // Modal de cliente
    document.getElementById('cancelClient')?.addEventListener('click', () => this.closeModal('clientModal'))
    document.getElementById('saveClient')?.addEventListener('click', () => this.saveClient())
    
    // Modal de empréstimo
    document.getElementById('cancelLoan')?.addEventListener('click', () => this.closeModal('loanModal'))
    document.getElementById('saveLoan')?.addEventListener('click', () => this.saveLoan())
    
    // Fechar modais clicando fora
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id)
        }
      })
    })
  }

  setupSearchEventListeners() {
    // Busca de clientes
    const clientSearch = document.getElementById('clientSearchCPF')
    if (clientSearch) {
      clientSearch.addEventListener('input', (e) => {
        this.filterClients(e.target.value)
      })
    }

    // Busca de empréstimos
    const loanSearch = document.getElementById('loanSearchCPF')
    if (loanSearch) {
      loanSearch.addEventListener('input', (e) => {
        this.filterLoans(e.target.value)
      })
    }

    // Filtro do dashboard
    const pendingFilter = document.getElementById('pendingCpfFilter')
    if (pendingFilter) {
      pendingFilter.addEventListener('input', (e) => {
        this.filterPendingDebts(e.target.value)
      })
    }
  }

  setupAuthStateListener() {
    authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this.showLoginScreen()
        this.clients = []
        this.loans = []
      } else if (event === 'SIGNED_IN') {
        this.showMainContent()
        this.loadInitialData()
      }
    })
  }

  async handleLogin() {
    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value

    if (!email || !password) {
      toast.error('Por favor, preencha email e senha')
      return
    }

    if (!validateEmail(email)) {
      toast.error('Email inválido')
      return
    }

    try {
      const result = await authService.signIn(email, password)
      
      if (result.success) {
        toast.success('Login realizado com sucesso!')
        this.showMainContent()
        await this.loadInitialData()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Erro no login:', error)
      toast.error('Erro ao fazer login')
    }
  }

  async handleLogout() {
    try {
      const result = await authService.signOut()
      
      if (result.success) {
        toast.success('Logout realizado com sucesso!')
        this.showLoginScreen()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Erro no logout:', error)
      toast.error('Erro ao fazer logout')
    }
  }

  switchView(viewId) {
    // Atualizar navegação
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active')
    })
    document.querySelector(`[data-view="${viewId}"]`).classList.add('active')

    // Mostrar view
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active')
    })
    document.getElementById(viewId).classList.add('active')

    this.currentView = viewId
    this.loadCurrentViewData()
  }

  openClientModal(clientId = null) {
    this.currentEditingClientId = clientId
    
    if (clientId) {
      // Modo edição - carregar dados do cliente
      const client = this.clients.find(c => c.id === clientId)
      if (client) {
        this.populateClientForm(client)
      }
    } else {
      // Modo criação - limpar formulário
      this.clearClientForm()
    }
    
    this.openModal('clientModal')
  }

  populateClientForm(client) {
    document.getElementById('clientName').value = client.name || ''
    document.getElementById('clientCPF').value = formatCPF(client.cpf) || ''
    document.getElementById('clientRG').value = client.rg || ''
    document.getElementById('clientBirthDate').value = client.birth_date || ''
    document.getElementById('clientMotherName').value = client.mother_name || ''
    document.getElementById('clientFatherName').value = client.father_name || ''
    document.getElementById('clientPhone').value = formatPhone(client.phone) || ''
    document.getElementById('clientEmail').value = client.email || ''
    document.getElementById('clientCEP').value = client.cep || ''
    document.getElementById('clientAddress').value = client.address || ''
    document.getElementById('clientNumber').value = client.number || ''
    document.getElementById('clientNeighborhood').value = client.neighborhood || ''
    document.getElementById('clientCity').value = client.city || ''
    document.getElementById('clientState').value = client.state || ''
    document.getElementById('clientComplement').value = client.complement || ''
  }

  clearClientForm() {
    document.querySelectorAll('#clientModal input').forEach(input => {
      input.value = ''
    })
  }

  async saveClient() {
    try {
      const formData = this.getClientFormData()
      
      if (!this.validateClientForm(formData)) {
        return
      }

      let result
      if (this.currentEditingClientId) {
        result = await clientService.updateClient(this.currentEditingClientId, formData)
      } else {
        result = await clientService.createClient(formData)
      }

      if (result.success) {
        toast.success(this.currentEditingClientId ? 'Cliente atualizado!' : 'Cliente cadastrado!')
        this.closeModal('clientModal')
        await this.loadClientsView()
        await this.loadDashboardData()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      toast.error('Erro ao salvar cliente')
    }
  }

  getClientFormData() {
    return {
      name: document.getElementById('clientName').value.trim(),
      cpf: cleanCPF(document.getElementById('clientCPF').value),
      rg: document.getElementById('clientRG').value.trim(),
      birth_date: document.getElementById('clientBirthDate').value,
      mother_name: document.getElementById('clientMotherName').value.trim(),
      father_name: document.getElementById('clientFatherName').value.trim(),
      phone: document.getElementById('clientPhone').value.trim(),
      email: document.getElementById('clientEmail').value.trim(),
      cep: document.getElementById('clientCEP').value.trim(),
      address: document.getElementById('clientAddress').value.trim(),
      number: document.getElementById('clientNumber').value.trim(),
      neighborhood: document.getElementById('clientNeighborhood').value.trim(),
      city: document.getElementById('clientCity').value.trim(),
      state: document.getElementById('clientState').value.trim(),
      complement: document.getElementById('clientComplement').value.trim()
    }
  }

  validateClientForm(data) {
    if (!data.name) {
      toast.error('Nome é obrigatório')
      return false
    }

    if (!data.cpf) {
      toast.error('CPF é obrigatório')
      return false
    }

    if (!validateCPF(data.cpf)) {
      toast.error('CPF inválido')
      return false
    }

    if (!data.phone) {
      toast.error('Telefone é obrigatório')
      return false
    }

    if (data.email && !validateEmail(data.email)) {
      toast.error('Email inválido')
      return false
    }

    return true
  }

  async openLoanModal(loanId = null) {
    this.currentEditingLoanId = loanId
    
    // Carregar lista de clientes para o select
    await this.loadClientsForLoanModal()
    
    if (loanId) {
      // Modo edição
      const loan = this.loans.find(l => l.id === loanId)
      if (loan) {
        this.populateLoanForm(loan)
      }
    } else {
      // Modo criação
      this.clearLoanForm()
    }
    
    this.openModal('loanModal')
  }

  async loadClientsForLoanModal() {
    try {
      const result = await clientService.getClients()
      
      if (result.success) {
        const select = document.getElementById('loanClientSelect')
        select.innerHTML = '<option value="" disabled selected>Selecione um cliente</option>'
        
        result.clients.forEach(client => {
          const option = document.createElement('option')
          option.value = client.id
          option.textContent = `${client.name} - ${formatCPF(client.cpf)}`
          select.appendChild(option)
        })
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    }
  }

  populateLoanForm(loan) {
    document.getElementById('loanClientSelect').value = loan.client_id
    document.getElementById('loanAmount').value = loan.amount
    document.getElementById('loanInterestRate').value = loan.interest_rate
    document.getElementById('loanMoraInterestRate').value = loan.mora_interest_rate
    document.getElementById('loanLateFeeRate').value = loan.late_fee_rate
    document.getElementById('loanInstallments').value = loan.installments_count
    document.getElementById('loanFirstDueDate').value = loan.first_due_date
  }

  clearLoanForm() {
    document.querySelectorAll('#loanModal input, #loanModal select').forEach(input => {
      if (input.type !== 'submit' && input.type !== 'button') {
        input.value = ''
      }
    })
  }

  async saveLoan() {
    try {
      const formData = this.getLoanFormData()
      
      if (!this.validateLoanForm(formData)) {
        return
      }

      let result
      if (this.currentEditingLoanId) {
        result = await loanService.updateLoan(this.currentEditingLoanId, formData)
      } else {
        result = await loanService.createLoan(formData)
      }

      if (result.success) {
        toast.success(this.currentEditingLoanId ? 'Empréstimo atualizado!' : 'Empréstimo registrado!')
        this.closeModal('loanModal')
        await this.loadLoansView()
        await this.loadDashboardData()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Erro ao salvar empréstimo:', error)
      toast.error('Erro ao salvar empréstimo')
    }
  }

  getLoanFormData() {
    return {
      client_id: document.getElementById('loanClientSelect').value,
      amount: parseFloat(document.getElementById('loanAmount').value),
      interest_rate: parseFloat(document.getElementById('loanInterestRate').value),
      mora_interest_rate: parseFloat(document.getElementById('loanMoraInterestRate').value) || 0,
      late_fee_rate: parseFloat(document.getElementById('loanLateFeeRate').value) || 0,
      installments_count: parseInt(document.getElementById('loanInstallments').value),
      first_due_date: document.getElementById('loanFirstDueDate').value
    }
  }

  validateLoanForm(data) {
    if (!data.client_id) {
      toast.error('Selecione um cliente')
      return false
    }

    if (!data.amount || data.amount <= 0) {
      toast.error('Valor do empréstimo deve ser maior que zero')
      return false
    }

    if (!data.interest_rate || data.interest_rate < 0) {
      toast.error('Taxa de juros inválida')
      return false
    }

    if (!data.installments_count || data.installments_count <= 0) {
      toast.error('Número de parcelas deve ser maior que zero')
      return false
    }

    if (!data.first_due_date) {
      toast.error('Data do primeiro vencimento é obrigatória')
      return false
    }

    return true
  }

  async viewLoanDetails(loanId) {
    try {
      const result = await loanService.getLoan(loanId)
      
      if (result.success) {
        this.showLoanDetailsModal(result.loan)
      } else {
        toast.error('Erro ao carregar detalhes do empréstimo')
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error)
      toast.error('Erro ao carregar detalhes')
    }
  }

  showLoanDetailsModal(loan) {
    const modal = document.getElementById('loanDetailModal')
    const title = document.getElementById('loanDetailTitle')
    const content = document.getElementById('loanDetailContent')
    const tbody = document.getElementById('installments-table-body')

    title.textContent = `Empréstimo - ${loan.clients.name}`
    
    content.innerHTML = `
      <div class="loan-details-summary">
        <div><strong>Cliente:</strong> ${loan.clients.name}</div>
        <div><strong>CPF:</strong> ${formatCPF(loan.clients.cpf)}</div>
        <div><strong>Valor Original:</strong> ${formatCurrency(loan.amount)}</div>
        <div><strong>Taxa de Juros:</strong> ${loan.interest_rate}%</div>
        <div><strong>Valor Total:</strong> ${formatCurrency(loan.total_value)}</div>
        <div><strong>Status:</strong> <span class="status-badge ${getStatusBadgeClass(loan.status)}">${getStatusText(loan.status)}</span></div>
      </div>
    `

    tbody.innerHTML = ''
    
    loan.payments.forEach(payment => {
      const row = document.createElement('tr')
      const isOverdue = new Date(payment.due_date) < new Date() && payment.status === 'pendente'
      
      row.innerHTML = `
        <td>${payment.installment_number}</td>
        <td>${formatDate(payment.due_date)}</td>
        <td>${formatCurrency(payment.amount)}</td>
        <td>
          <span class="status-badge ${getStatusBadgeClass(payment.status)}">
            ${getStatusText(payment.status)}
          </span>
        </td>
        <td>
          ${payment.status === 'pendente' ? `
            <button class="btn success-btn" onclick="app.markPaymentAsPaid('${payment.id}')">
              Marcar como Pago
            </button>
          ` : payment.paid_at ? formatDate(payment.paid_at) : '---'}
        </td>
      `
      
      tbody.appendChild(row)
    })

    this.openModal('loanDetailModal')
  }

  async markPaymentAsPaid(paymentId) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const result = await loanService.updatePaymentStatus(paymentId, 'pago', today)
      
      if (result.success) {
        toast.success('Pagamento registrado!')
        // Recarregar detalhes do empréstimo
        const loanId = result.payment.loan_id
        await this.viewLoanDetails(loanId)
        await this.loadDashboardData()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error)
      toast.error('Erro ao registrar pagamento')
    }
  }

  async editClient(clientId) {
    this.openClientModal(clientId)
  }

  async editLoan(loanId) {
    this.openLoanModal(loanId)
  }

  async deleteClient(clientId) {
    if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const result = await clientService.deleteClient(clientId)
      
      if (result.success) {
        toast.success('Cliente excluído!')
        await this.loadClientsView()
        await this.loadDashboardData()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      toast.error('Erro ao excluir cliente')
    }
  }

  async deleteLoan(loanId) {
    if (!confirm('Tem certeza que deseja excluir este empréstimo? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const result = await loanService.deleteLoan(loanId)
      
      if (result.success) {
        toast.success('Empréstimo excluído!')
        await this.loadLoansView()
        await this.loadDashboardData()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Erro ao excluir empréstimo:', error)
      toast.error('Erro ao excluir empréstimo')
    }
  }

  generateClientReport(clientId) {
    if (typeof ReportGenerator !== 'undefined') {
      ReportGenerator.generatePdf(clientId)
    } else {
      toast.error('Gerador de relatórios não disponível')
    }
  }

  filterClients(cpf) {
    // Implementar filtro de clientes
    // Por enquanto, recarregar com filtro
    if (cpf.length >= 3) {
      clientService.getClients({ cpf }).then(result => {
        if (result.success) {
          this.clients = result.clients
          this.renderClientsTable()
        }
      })
    } else if (cpf.length === 0) {
      this.loadClientsView()
    }
  }

  filterLoans(cpf) {
    // Implementar filtro de empréstimos
    if (cpf.length >= 3) {
      loanService.getLoans({ clientCpf: cpf }).then(result => {
        if (result.success) {
          this.loans = result.loans
          this.renderLoansTable()
        }
      })
    } else if (cpf.length === 0) {
      this.loadLoansView()
    }
  }

  filterPendingDebts(cpf) {
    // Implementar filtro da tabela de dívidas pendentes
    const rows = document.querySelectorAll('#pending-debts-table-body tr')
    
    rows.forEach(row => {
      const cpfCell = row.cells[2]
      if (cpfCell) {
        const rowCpf = cpfCell.textContent.toLowerCase()
        const searchCpf = cpf.toLowerCase()
        
        if (rowCpf.includes(searchCpf)) {
          row.style.display = ''
        } else {
          row.style.display = 'none'
        }
      }
    })
  }

  async toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode')
    
    // Salvar preferência no perfil do usuário
    try {
      await authService.updateProfile({ dark_mode: isDark })
    } catch (error) {
      console.error('Erro ao salvar preferência de tema:', error)
    }
    
    // Atualizar ícone
    const icon = document.getElementById('darkModeIcon')
    if (icon) {
      icon.textContent = isDark ? '☀️' : '🌙'
    }
  }

  openAdminModal() {
    // Implementar modal de administração
    toast.info('Funcionalidade de administração em desenvolvimento')
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.classList.add('show-modal')
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.classList.remove('show-modal')
    }
  }

  // Utilitários
  formatCurrency = formatCurrency
  formatCPF = formatCPF
  formatPhone = formatPhone
  formatDate = formatDate
}

// Inicializar aplicação
const app = new SharkProApp()

// Expor globalmente para uso nos event handlers inline
window.app = app