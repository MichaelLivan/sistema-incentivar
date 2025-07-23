import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Footer } from '../ui/Footer';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { UserPlus, Users, Building, Trash2, Edit2, Plus, Search } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  type: string;
  sector?: string;
  created_at: string;
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

  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    type: 'at-aba',
    sector: 'aba',
    password: ''
  });

  // Verificação de acesso
  if (!user || user.type !== 'adm-geral') {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
          <p className="text-gray-600">Esta página é restrita ao administrador geral.</p>
          <p className="text-sm text-gray-500 mt-2">Tipo atual: {user?.type || 'Não definido'}</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersData, patientsData] = await Promise.all([
          apiService.getUsers(),
          apiService.getPatients()
        ]);
        setUsers(usersData || []);
        setPatients(patientsData || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUserForm(prev => ({
      ...prev,
      [name]: value,
      // Auto-ajustar setor baseado no tipo
      ...(name === 'type' && value.includes('-') ? {
        sector: value.split('-')[1] || 'aba'
      } : {})
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserForm.name || !newUserForm.email) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      const userData = {
        name: newUserForm.name,
        email: newUserForm.email,
        type: newUserForm.type,
        sector: newUserForm.sector,
        ...(newUserForm.password && { password: newUserForm.password })
      };

      if (editingUser) {
        await apiService.updateUser(editingUser, userData);
      } else {
        await apiService.createUser(userData);
      }
      
      const usersData = await apiService.getUsers();
      setUsers(usersData || []);
      
      setNewUserForm({
        name: '',
        email: '',
        type: 'at-aba',
        sector: 'aba',
        password: ''
      });
      setEditingUser(null);
      setShowUserForm(false);
      alert(`Usuário ${editingUser ? 'atualizado' : 'cadastrado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      alert(`Erro ao ${editingUser ? 'atualizar' : 'cadastrar'} usuário`);
    }
  };

  const handleEditUser = (userId: string) => {
    const userToEdit = users.find(u => u.id === userId);
    if (userToEdit) {
      setNewUserForm({
        name: userToEdit.name,
        email: userToEdit.email,
        type: userToEdit.type,
        sector: userToEdit.sector || 'aba',
        password: ''
      });
      setEditingUser(userId);
      setShowUserForm(true);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    if (window.confirm(`Tem certeza que deseja excluir o usuário "${userToDelete.name}"?`)) {
      try {
        await apiService.deleteUser(userId);
        const usersData = await apiService.getUsers();
        setUsers(usersData || []);
        alert('Usuário excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário');
      }
    }
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
          <p className="text-lg text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
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
            <Button onClick={() => setShowUserForm(!showUserForm)}>
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

          {/* Formulário de Usuário */}
          {showUserForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800">
                {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
              </h3>
              
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
                  />
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
                      <option value="coordenacao-aba" disabled>Coordenação - ABA (Removido)</option>
                      <option value="coordenacao-denver" disabled>Coordenação - Denver (Removido)</option>
                      <option value="coordenacao-grupo" disabled>Coordenação - Grupo (Removido)</option>
                      <option value="coordenacao-escolar" disabled>Coordenação - Escolar (Removido)</option>
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
                  >
                    <option value="aba">ABA</option>
                    <option value="denver">Denver</option>
                    <option value="grupo">Grupo</option>
                    <option value="escolar">Escolar</option>
                  </Select>
                </div>

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
                      placeholder="Deixe em branco para gerar automaticamente"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Se não informada, será gerada uma senha temporária
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    setShowUserForm(false);
                    setEditingUser(null);
                    setNewUserForm({
                      name: '',
                      email: '',
                      type: 'at-aba',
                      sector: 'aba',
                      password: ''
                    });
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingUser ? 'Atualizar' : 'Cadastrar'} Usuário
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
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditUser(user.id)}
                        title="Editar usuário"
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Excluir usuário"
                      >
                        <Trash2 size={14} />
                      </Button>
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
            </div>
          )}
        </CardContent>
      </Card>
      
      <Footer />
    </div>
  );
};
