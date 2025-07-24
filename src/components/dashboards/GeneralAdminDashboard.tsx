import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Footer } from '../ui/Footer';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { UserPlus, Users, Building, Trash2, Edit2, Plus, Search, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  type: string;
  sector?: string;
  created_at: string;
  active?: boolean;
}

interface SectorStats {
  sector: string;
  ats: number;
  patients: number;
  coordenadores: number;
  admins: number;
}

export const GeneralAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSector, setFilterSector] = useState('all');
  const [submittingForm, setSubmittingForm] = useState(false); // ✅ NOVO: Estado para submissão
  const [formError, setFormError] = useState<string | null>(null); // ✅ NOVO: Estado para erros do formulário

  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    type: 'at-aba',
    sector: 'aba',
    password: '',
    hourly_rate: 35 // ✅ NOVO: Campo para valor por hora
  });

  // ✅ VERIFICAÇÃO CORRIGIDA: Verificar se é admin geral
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
            <p className="text-gray-500 text-sm">
              Para acessar esta página, faça login com uma conta de <strong>administrador geral</strong>.
            </p>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">💡 Credencial de teste:</p>
              <p className="text-sm text-blue-700">Email: adm.geral@incentivar.com</p>
              <p className="text-sm text-blue-700">Senha: 123456</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔄 [ADMIN GERAL] Carregando dados...');
        
        const [usersData, patientsData] = await Promise.all([
          apiService.getUsers().catch(err => {
            console.error('❌ [ADMIN GERAL] Erro ao carregar usuários:', err);
            return [];
          }),
          apiService.getPatients().catch(err => {
            console.error('❌ [ADMIN GERAL] Erro ao carregar pacientes:', err);
            return [];
          })
        ]);
        
        console.log('✅ [ADMIN GERAL] Dados carregados:', {
          usuarios: usersData.length,
          pacientes: patientsData.length
        });
        
        setUsers(usersData || []);
        setPatients(patientsData || []);
      } catch (error) {
        console.error('❌ [ADMIN GERAL] Erro geral ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calcular estatísticas por setor
  const getSectorStats = (): SectorStats[] => {
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

  // ✅ FUNÇÃO CORRIGIDA: Tratar mudanças nos inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormError(null); // Limpar erro ao digitar
    
    setNewUserForm(prev => {
      const newForm = {
        ...prev,
        [name]: value
      };
      
      // ✅ CORREÇÃO: Auto-ajustar setor baseado no tipo selecionado
      if (name === 'type') {
        if (value.includes('-') && value !== 'adm-geral' && value !== 'financeiro-ats' && value !== 'financeiro-pct') {
          const extractedSector = value.split('-')[1];
          if (['aba', 'denver', 'grupo', 'escolar'].includes(extractedSector)) {
            newForm.sector = extractedSector;
          }
        }
        
        // ✅ Ajustar valor por hora baseado no tipo
        if (value.startsWith('at-')) {
          newForm.hourly_rate = 35; // Valor padrão para ATs
        } else if (value.startsWith('coordenacao-')) {
          newForm.hourly_rate = 40; // Valor padrão para coordenação
        } else {
          newForm.hourly_rate = 0; // Sem valor para outros tipos
        }
      }
      
      // ✅ CORREÇÃO: Tratar campo hourly_rate como número
      if (name === 'hourly_rate') {
        newForm.hourly_rate = value === '' ? 0 : Number(value);
      }
      
      return newForm;
    });
  };

  // ✅ FUNÇÃO TOTALMENTE CORRIGIDA: Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setFormError(null);
    setSubmittingForm(true);
    
    console.log('📤 [ADMIN GERAL] Submetendo formulário:', newUserForm);
    
    // ✅ Validações do lado cliente
    if (!newUserForm.name.trim()) {
      setFormError('Nome é obrigatório');
      setSubmittingForm(false);
      return;
    }
    
    if (!newUserForm.email.trim()) {
      setFormError('Email é obrigatório');
      setSubmittingForm(false);
      return;
    }
    
    if (!newUserForm.type) {
      setFormError('Tipo de usuário é obrigatório');
      setSubmittingForm(false);
      return;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserForm.email)) {
      setFormError('Formato de email inválido');
      setSubmittingForm(false);
      return;
    }
    
    // ✅ Verificar se setor é necessário
    const needsSector = newUserForm.type.startsWith('at-') || 
                       newUserForm.type.startsWith('coordenacao-') || 
                       (newUserForm.type.startsWith('adm-') && newUserForm.type !== 'adm-geral');

    if (needsSector && !newUserForm.sector) {
      setFormError('Setor é obrigatório para esse tipo de usuário');
      setSubmittingForm(false);
      return;
    }

    try {
      // ✅ CORREÇÃO: Preparar dados corretamente
      const userData = {
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        type: newUserForm.type,
        ...(needsSector && { sector: newUserForm.sector }),
        ...(newUserForm.hourly_rate > 0 && { hourly_rate: newUserForm.hourly_rate }),
        ...(newUserForm.password.trim() && { password: newUserForm.password.trim() })
      };

      console.log('📋 [ADMIN GERAL] Dados a serem enviados:', userData);

      if (editingUser) {
        console.log('📝 [ADMIN GERAL] Atualizando usuário:', editingUser);
        await apiService.updateUser(editingUser, userData);
      } else {
        console.log('➕ [ADMIN GERAL] Criando novo usuário');
        await apiService.createUser(userData);
      }
      
      // ✅ Recarregar lista de usuários
      console.log('🔄 [ADMIN GERAL] Recarregando lista de usuários...');
      const usersData = await apiService.getUsers();
      setUsers(usersData || []);
      
      // ✅ Limpar formulário e fechar
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
      
      const action = editingUser ? 'atualizado' : 'cadastrado';
      alert(`✅ Usuário ${action} com sucesso!`);
      console.log(`✅ [ADMIN GERAL] Usuário ${action} com sucesso`);
      
    } catch (error) {
      console.error('❌ [ADMIN GERAL] Erro ao salvar usuário:', error);
      
      let errorMessage = `Erro ao ${editingUser ? 'atualizar' : 'cadastrar'} usuário`;
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setFormError(errorMessage);
    } finally {
      setSubmittingForm(false);
    }
  };

  // ✅ FUNÇÃO CORRIGIDA: Editar usuário
  const handleEditUser = (userId: string) => {
    const userToEdit = users.find(u => u.id === userId);
    if (userToEdit) {
      console.log('📝 [ADMIN GERAL] Editando usuário:', userToEdit);
      
      setNewUserForm({
        name: userToEdit.name,
        email: userToEdit.email,
        type: userToEdit.type,
        sector: userToEdit.sector || 'aba',
        password: '', // Não preencher senha na edição
        hourly_rate: 35 // Valor padrão, será ajustado pelo backend se necessário
      });
      setEditingUser(userId);
      setShowUserForm(true);
      setFormError(null);
    }
  };

  // ✅ FUNÇÃO CORRIGIDA: Excluir usuário
  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    const confirmMessage = `Tem certeza que deseja excluir o usuário "${userToDelete.name}"?\n\n` +
      `⚠️ Esta ação é irreversível e também excluirá:\n` +
      `• Todos os dados relacionados ao usuário\n` +
      `• Sessões e supervisões (se for AT)\n` +
      `• Pacientes vinculados (se for responsável)`;

    if (window.confirm(confirmMessage)) {
      try {
        console.log('🗑️ [ADMIN GERAL] Excluindo usuário:', userId);
        
        await apiService.deleteUser(userId);
        
        // Recarregar dados
        const [usersData, patientsData] = await Promise.all([
          apiService.getUsers(),
          apiService.getPatients()
        ]);
        
        setUsers(usersData || []);
        setPatients(patientsData || []);
        
        alert('✅ Usuário excluído com sucesso!');
        console.log('✅ [ADMIN GERAL] Usuário excluído com sucesso');
        
      } catch (error) {
        console.error('❌ [ADMIN GERAL] Erro ao excluir usuário:', error);
        alert('❌ Erro ao excluir usuário. Tente novamente.');
      }
    }
  };

  // ✅ Cancelar edição
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

  const sectorStats = getSectorStats();
  const totalUsers = users.length;
  const totalPatients = patients.length;
  const totalATs = users.filter(u => u.type.startsWith('at-')).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando dados do sistema...</p>
          <p className="text-sm text-gray-500">Usuários, pacientes e estatísticas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header de Boas-vindas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="w-6 h-6" />
            <span>Administração Geral - Sistema Completo</span>
          </CardTitle>
          <p className="text-gray-600">
            Gerencie todos os usuários, pacientes e configurações do sistema.
          </p>
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