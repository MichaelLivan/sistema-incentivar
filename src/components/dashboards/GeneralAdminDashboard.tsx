import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Footer } from '../ui/Footer';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { UserPlus, Users, Building, Trash2, Edit2, Plus, Search, AlertCircle, CheckCircle, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';

export const GeneralAdminDashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSector, setFilterSector] = useState('all');
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formError, setFormError] = useState(null);
  const [operationStatus, setOperationStatus] = useState(null); // Para feedback de operações
  const [connectionError, setConnectionError] = useState(false);

  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    type: 'at-aba',
    sector: 'aba',
    password: '',
    hourly_rate: 35
  });

  // Verificação de permissão melhorada
  if (!user || user.type !== 'adm-geral') {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="text-center py-8">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
            <p className="text-gray-600 mb-2">Esta página é restrita ao administrador geral.</p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Usuário atual:</strong> {user?.name || 'Não identificado'}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Email:</strong> {user?.email || 'Não identificado'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Tipo:</strong> <code className="bg-red-100 px-2 py-1 rounded">{user?.type || 'Não definido'}</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Função para mostrar status das operações
  const showOperationStatus = (type, message, duration = 3000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  // Carregamento inicial melhorado
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setConnectionError(false);
        console.log('🔄 [ADMIN GERAL] Carregando dados...');
        
        // Primeiro, testar conectividade
        try {
          await apiService.testBasicConnectivity();
          console.log('✅ [ADMIN GERAL] Conectividade OK');
        } catch (connError) {
          console.error('❌ [ADMIN GERAL] Erro de conectividade:', connError);
          setConnectionError(true);
          throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
        }
        
        // Carregar dados
        const [usersData, patientsData] = await Promise.allSettled([
          apiService.getUsers(),
          apiService.getPatients()
        ]);
        
        // Processar resultados
        if (usersData.status === 'fulfilled') {
          setUsers(usersData.value || []);
          console.log('✅ [ADMIN GERAL] Usuários carregados:', usersData.value?.length || 0);
        } else {
          console.error('❌ [ADMIN GERAL] Erro ao carregar usuários:', usersData.reason);
          setUsers([]);
        }
        
        if (patientsData.status === 'fulfilled') {
          setPatients(patientsData.value || []);
          console.log('✅ [ADMIN GERAL] Pacientes carregados:', patientsData.value?.length || 0);
        } else {
          console.error('❌ [ADMIN GERAL] Erro ao carregar pacientes:', patientsData.reason);
          setPatients([]);
        }
        
      } catch (error) {
        console.error('❌ [ADMIN GERAL] Erro geral ao carregar dados:', error);
        showOperationStatus('error', 'Erro ao carregar dados: ' + error.message, 5000);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Função para recarregar dados
  const reloadData = async () => {
    try {
      console.log('🔄 [ADMIN GERAL] Recarregando dados...');
      const usersData = await apiService.getUsers();
      setUsers(usersData || []);
      showOperationStatus('success', 'Dados atualizados com sucesso!');
    } catch (error) {
      console.error('❌ [ADMIN GERAL] Erro ao recarregar:', error);
      showOperationStatus('error', 'Erro ao recarregar dados: ' + error.message);
    }
  };

  // Tratamento de mudanças do formulário melhorado
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormError(null);
    
    setNewUserForm(prev => {
      const newForm = { ...prev, [name]: value };
      
      // Auto-ajustar setor baseado no tipo
      if (name === 'type') {
        if (value.includes('-') && value !== 'adm-geral' && !value.startsWith('financeiro-')) {
          const extractedSector = value.split('-')[1];
          if (['aba', 'denver', 'grupo', 'escolar'].includes(extractedSector)) {
            newForm.sector = extractedSector;
          }
        }
        
        // Ajustar valor por hora
        if (value.startsWith('at-')) {
          newForm.hourly_rate = 35;
        } else if (value.startsWith('coordenacao-')) {
          newForm.hourly_rate = 40;
        } else {
          newForm.hourly_rate = 0;
        }
      }
      
      if (name === 'hourly_rate') {
        newForm.hourly_rate = value === '' ? 0 : Number(value);
      }
      
      return newForm;
    });
  };

  // Submit do formulário com validações melhoradas
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setFormError(null);
    setSubmittingForm(true);
    
    try {
      console.log('📤 [ADMIN GERAL] Submetendo formulário:', { ...newUserForm, password: '***' });
      
      // Validações detalhadas
      const validations = [
        { field: 'name', value: newUserForm.name?.trim(), message: 'Nome é obrigatório' },
        { field: 'email', value: newUserForm.email?.trim(), message: 'Email é obrigatório' },
        { field: 'type', value: newUserForm.type, message: 'Tipo de usuário é obrigatório' }
      ];
      
      for (const validation of validations) {
        if (!validation.value) {
          throw new Error(validation.message);
        }
      }
      
      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUserForm.email)) {
        throw new Error('Formato de email inválido');
      }
      
      // Verificar se setor é necessário
      const needsSector = newUserForm.type.startsWith('at-') || 
                         newUserForm.type.startsWith('coordenacao-') || 
                         (newUserForm.type.startsWith('adm-') && newUserForm.type !== 'adm-geral');

      if (needsSector && !newUserForm.sector) {
        throw new Error('Setor é obrigatório para esse tipo de usuário');
      }

      // Preparar dados
      const userData = {
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        type: newUserForm.type,
        ...(needsSector && { sector: newUserForm.sector }),
        ...(newUserForm.hourly_rate > 0 && { hourly_rate: newUserForm.hourly_rate }),
        ...(newUserForm.password.trim() && { password: newUserForm.password.trim() })
      };

      // Executar operação
      if (editingUser) {
        await apiService.updateUser(editingUser, userData);
        showOperationStatus('success', 'Usuário atualizado com sucesso!');
      } else {
        await apiService.createUser(userData);
        showOperationStatus('success', 'Usuário criado com sucesso!');
      }
      
      // Recarregar dados e limpar formulário
      await reloadData();
      handleCancelEdit();
      
    } catch (error) {
      console.error('❌ [ADMIN GERAL] Erro ao salvar usuário:', error);
      setFormError(error.message);
    } finally {
      setSubmittingForm(false);
    }
  };

  // Editar usuário melhorado
  const handleEditUser = (userId) => {
    const userToEdit = users.find(u => u.id === userId);
    if (userToEdit) {
      console.log('📝 [ADMIN GERAL] Editando usuário:', userToEdit);
      
      setNewUserForm({
        name: userToEdit.name,
        email: userToEdit.email,
        type: userToEdit.type,
        sector: userToEdit.sector || 'aba',
        password: '',
        hourly_rate: userToEdit.hourly_rate || 35
      });
      setEditingUser(userId);
      setShowUserForm(true);
      setFormError(null);
    }
  };

  // Excluir usuário com confirmação melhorada
  const handleDeleteUser = async (userId) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    const confirmMessage = `⚠️ ATENÇÃO: Exclusão Permanente\n\n` +
      `Usuário: ${userToDelete.name}\n` +
      `Email: ${userToDelete.email}\n` +
      `Tipo: ${userToDelete.type}\n\n` +
      `Esta ação irá:\n` +
      `• Excluir permanentemente o usuário\n` +
      `• Remover todas as sessões relacionadas\n` +
      `• Remover todas as supervisões relacionadas\n` +
      `• Desvincular pacientes (se aplicável)\n\n` +
      `⚠️ ESTA AÇÃO NÃO PODE SER DESFEITA!\n\n` +
      `Digite "CONFIRMAR" para prosseguir:`;

    const userConfirmation = prompt(confirmMessage);
    
    if (userConfirmation !== 'CONFIRMAR') {
      console.log('🚫 [ADMIN GERAL] Exclusão cancelada pelo usuário');
      return;
    }

    try {
      console.log('🗑️ [ADMIN GERAL] Excluindo usuário:', userId);
      
      const result = await apiService.deleteUser(userId);
      
      console.log('✅ [ADMIN GERAL] Resultado da exclusão:', result);
      
      // Mostrar resultado detalhado
      if (result.deletedData) {
        const details = result.deletedData;
        let message = `✅ Usuário "${details.user}" excluído com sucesso!\n\n`;
        
        if (details.sessionsDeleted > 0) {
          message += `• ${details.sessionsDeleted} sessões removidas\n`;
        }
        if (details.supervisionsDeleted > 0) {
          message += `• ${details.supervisionsDeleted} supervisões removidas\n`;
        }
        if (details.patientsUnlinked > 0) {
          message += `• ${details.patientsUnlinked} pacientes desvinculados\n`;
        }
        
        showOperationStatus('success', message, 5000);
      } else {
        showOperationStatus('success', 'Usuário excluído com sucesso!');
      }
      
      // Recarregar dados
      await reloadData();
      
    } catch (error) {
      console.error('❌ [ADMIN GERAL] Erro ao excluir usuário:', error);
      showOperationStatus('error', 'Erro ao excluir usuário: ' + error.message, 5000);
    }
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setNewUserForm({
      name: '',
      email: '',
      type: 'at-aba',
      sector: 'aba',
      password: '',
      hourly_rate: 35
    });
    setEditingUser(null);
    setShowUserForm(false);
    setFormError(null);
  };

  // Filtrar usuários
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || 
                       (filterType === 'ats' && user.type.startsWith('at-')) ||
                       (filterType === 'admins' && user.type.startsWith('adm-')) ||
                       (filterType === 'coordenacao' && user.type.startsWith('coordenacao-')) ||
                       (filterType === 'financeiro' && user.type.startsWith('financeiro-')) ||
                       (filterType === 'pais' && user.type === 'pais');
    
    const matchesSector = filterSector === 'all' || user.sector === filterSector;
    
    return matchesSearch && matchesType && matchesSector;
  });

  // Calcular estatísticas
  const getSectorStats = () => {
    const sectors = ['aba', 'denver', 'grupo', 'escolar'];
    
    return sectors.map(sector => {
      const sectorUsers = users.filter(u => u.sector === sector);
      const sectorPatients = patients.filter(p => p.sector === sector);
      
      return {
        sector,
        ats: sectorUsers.filter(u => u.type.startsWith('at-')).length,
        patients: sectorPatients.length,
        coordenadores: sectorUsers.filter(u => u.type.startsWith('coordenacao-')).length,
        admins: sectorUsers.filter(u => u.type.startsWith('adm-')).length
      };
    });
  };

  const sectorStats = getSectorStats();
  const totalUsers = users.length;
  const totalPatients = patients.length;
  const totalATs = users.filter(u => u.type.startsWith('at-')).length;

  // Loading state melhorado
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando dados do sistema...</p>
          <p className="text-sm text-gray-500">Usuários, pacientes e estatísticas</p>
          {connectionError && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-center space-x-2">
                <WifiOff className="w-5 h-5 text-red-600" />
                <p className="text-red-800 font-medium">Problema de conectividade detectado</p>
              </div>
              <p className="text-red-700 text-sm mt-2">
                Verifique se o servidor backend está rodando na porta 3001
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Status das Operações */}
      {operationStatus && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
          operationStatus.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start space-x-3">
            {operationStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className={`font-medium text-sm ${
                operationStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {operationStatus.type === 'success' ? 'Sucesso!' : 'Erro!'}
              </p>
              <p className={`text-sm whitespace-pre-line ${
                operationStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {operationStatus.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header de Boas-vindas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="w-6 h-6" />
                <span>Administração Geral - Sistema Completo</span>
              </CardTitle>
              <p className="text-gray-600">
                Gerencie todos os usuários, pacientes e configurações do sistema.
              </p>
            </div>
            <Button 
              onClick={reloadData}
              variant="secondary"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
          <div className="bg-green-50 p-3 rounded-lg mt-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">
                ✅ Acesso total liberado para: {user.name}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Usuários</p>
              <p className="text-2xl font-bold text-purple-700">{totalUsers}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total ATs</p>
              <p className="text-2xl font-bold text-purple-700">{totalATs}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-pink-100 rounded-lg">
              <Building className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Pacientes</p>
              <p className="text-2xl font-bold text-purple-700">{totalPatients}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Building className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Setores Ativos</p>
              <p className="text-2xl font-bold text-purple-700">4</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas por Setor */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas por Setor</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>Setor</TableHeadCell>
                <TableHeadCell>ATs</TableHeadCell>
                <TableHeadCell>Pacientes</TableHeadCell>
                <TableHeadCell>Coordenadores</TableHeadCell>
                <TableHeadCell>Administradores</TableHeadCell>
                <TableHeadCell>Total</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectorStats.map(stat => (
                <TableRow key={stat.sector}>
                  <TableCell className="font-medium uppercase">{stat.sector}</TableCell>
                  <TableCell className="text-blue-600">{stat.ats}</TableCell>
                  <TableCell className="text-green-600">{stat.patients}</TableCell>
                  <TableCell className="text-purple-600">{stat.coordenadores}</TableCell>
                  <TableCell className="text-orange-600">{stat.admins}</TableCell>
                  <TableCell className="font-bold">
                    {stat.ats + stat.patients + stat.coordenadores + stat.admins}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Gerenciamento de Usuários */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gerenciar Usuários</CardTitle>
            <Button 
              onClick={() => {
                setShowUserForm(!showUserForm);
                setEditingUser(null);
                setFormError(null);
              }}
              disabled={submittingForm}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Todos os tipos</option>
              <option value="ats">ATs</option>
              <option value="admins">Administradores</option>
              <option value="coordenacao">Coordenação</option>
              <option value="financeiro">Financeiro</option>
              <option value="pais">Pais</option>
            </Select>

            <Select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
            >
              <option value="all">Todos os setores</option>
              <option value="aba">ABA</option>
              <option value="denver">Denver</option>
              <option value="grupo">Grupo</option>
              <option value="escolar">Escolar</option>
            </Select>

            <div className="text-sm text-gray-500">
              {filteredUsers.length} usuário(s) encontrado(s)
            </div>
          </div>

          {/* ✅ FORMULÁRIO TOTALMENTE CORRIGIDO */}
          {showUserForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-6 bg-gray-50 rounded-lg border-2 border-purple-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-purple-800">
                  {editingUser ? '📝 Editar Usuário' : '➕ Cadastrar Novo Usuário'}
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={submittingForm}
                >
                  ✕ Cancelar
                </Button>
              </div>
              
              {/* ✅ Exibir erro do formulário */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-800 text-sm">Erro no formulário:</p>
                      <p className="text-red-700 text-sm">{formError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Nome Completo *
                  </label>
                  <Input
                    name="name"
                    value={newUserForm.name}
                    onChange={handleInputChange}
                    placeholder="Nome completo"
                    required
                    disabled={submittingForm}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Email *
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={newUserForm.email}
                    onChange={handleInputChange}
                    placeholder="email@exemplo.com"
                    required
                    disabled={submittingForm || !!editingUser}
                  />
                  {editingUser && (
                    <p className="text-xs text-gray-500 mt-1">Email não pode ser alterado</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Tipo de Usuário *
                  </label>
                  <Select
                    name="type"
                    value={newUserForm.type}
                    onChange={handleInputChange}
                    required
                    disabled={submittingForm}
                  >
                    <optgroup label="Acompanhantes Terapêuticos">
                      <option value="at-aba">AT - ABA</option>
                      <option value="at-denver">AT - Denver</option>
                      <option value="at-grupo">AT - Grupo</option>
                      <option value="at-escolar">AT - Escolar</option>
                    </optgroup>
                    <optgroup label="Administradores">
                      <option value="adm-aba">Admin - ABA</option>
                      <option value="adm-denver">Admin - Denver</option>
                      <option value="adm-grupo">Admin - Grupo</option>
                      <option value="adm-escolar">Admin - Escolar</option>
                      <option value="adm-geral">Admin - Geral</option>
                    </optgroup>
                    <optgroup label="Financeiro">
                      <option value="financeiro-ats">Financeiro - ATs</option>
                      <option value="financeiro-pct">Financeiro - PCT</option>
                    </optgroup>
                    <optgroup label="Outros">
                      <option value="pais">Pais/Responsáveis</option>
                    </optgroup>
                    <optgroup label="⚠️ Descontinuados">
                      <option value="coordenacao-aba">Coordenação - ABA (Removido)</option>
                      <option value="coordenacao-denver">Coordenação - Denver (Removido)</option>
                      <option value="coordenacao-grupo">Coordenação - Grupo (Removido)</option>
                      <option value="coordenacao-escolar">Coordenação - Escolar (Removido)</option>
                    </optgroup>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Setor
                  </label>
                  <Select
                    name="sector"
                    value={newUserForm.sector}
                    onChange={handleInputChange}
                    disabled={submittingForm}
                  >
                    <option value="aba">ABA</option>
                    <option value="denver">Denver</option>
                    <option value="grupo">Grupo</option>
                    <option value="escolar">Escolar</option>
                  </Select>
                </div>

                {/* ✅ Campo de valor por hora */}
                {(newUserForm.type.startsWith('at-') || newUserForm.type.startsWith('coordenacao-')) && (
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Valor por Hora (R$)
                    </label>
                    <Input
                      type="number"
                      name="hourly_rate"
                      value={newUserForm.hourly_rate === 0 ? '' : String(newUserForm.hourly_rate)}
                      onChange={handleInputChange}
                      placeholder="35.00"
                      disabled={submittingForm}
                      inputProps={{
                        step: "0.01",
                        min: "0"
                      }}
                    />
                  </div>
                )}

                {!editingUser && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Senha Temporária
                    </label>
                    <Input
                      type="password"
                      name="password"
                      value={newUserForm.password}
                      onChange={handleInputChange}
                      placeholder="Deixe em branco para usar senha padrão (123456)"
                      disabled={submittingForm}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Se não informada, será definida como "123456" (pode ser alterada após o primeiro login)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleCancelEdit}
                  disabled={submittingForm}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={submittingForm}
                >
                  {submittingForm ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {editingUser ? 'Atualizando...' : 'Cadastrando...'}
                    </>
                  ) : (
                    <>
                      {editingUser ? '📝 Atualizar' : '➕ Cadastrar'} Usuário
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Lista de Usuários */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>Nome</TableHeadCell>
                <TableHeadCell>Email</TableHeadCell>
                <TableHeadCell>Tipo</TableHeadCell>
                <TableHeadCell>Setor</TableHeadCell>
                <TableHeadCell>Criado em</TableHeadCell>
                <TableHeadCell>Ações</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {user.type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="uppercase">{user.sector || 'N/A'}</TableCell>
                  <TableCell>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <span title="Editar usuário">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditUser(user.id)}
                          disabled={submittingForm}
                        >
                          <Edit2 size={14} />
                        </Button>
                      </span>
                      <span title="Excluir usuário">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={submittingForm}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p>Nenhum usuário encontrado com os filtros aplicados</p>
              {searchTerm && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                >
                  Limpar busca
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Footer />
    </div>
  );
};