import React, { useState } from 'react';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Footer } from '../ui/Footer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Clock, Calendar, Users, BookOpen } from 'lucide-react';
import { formatHours, formatDateBR } from '../../utils/formatters';

export const CoordenacaoDashboard: React.FC = () => {
  const { user } = useAuth();
  const [ats, setAts] = useState([]);
  const [supervisions, setSupervisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supervisionForm, setSupervisionForm] = useState({
    atId: '',
    startTime: '',
    endTime: '',
    date: (() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    observations: '',
  });

  const userSector = user?.sector;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [atsData, supervisionsData] = await Promise.all([
          apiService.getATs(),
          apiService.getSupervisions()
        ]);
        setAts(atsData);
        setSupervisions(supervisionsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const sectorATs = ats.filter(at => at.sector === userSector);

  const calculateHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const hours = Math.max(0, (endMinutes - startMinutes) / 60);
    // CORREÇÃO: Retornar horas exatas, sem arredondamento
    return hours;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSupervisionForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const createSupervision = async () => {
      try {
        await apiService.createSupervision({
          at_id: supervisionForm.atId,
          start_time: supervisionForm.startTime,
          end_time: supervisionForm.endTime,
          date: supervisionForm.date,
          observations: supervisionForm.observations
        });
        
        // Recarregar supervisões
        const supervisionsData = await apiService.getSupervisions();
        setSupervisions(supervisionsData);
        
        setSupervisionForm({
          atId: '',
          startTime: '',
          endTime: '',
          date: new Date().toISOString().split('T')[0],
          observations: '',
        });
      } catch (error) {
        console.error('Erro ao criar supervisão:', error);
        alert('Erro ao lançar supervisão');
      }
    };

    createSupervision();
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthSupervisions = supervisions.filter(s => {
    const supervisionDate = new Date(s.date + 'T00:00:00'); // CORREÇÃO: Adicionar timezone
    return supervisionDate.getMonth() === currentMonth && 
           supervisionDate.getFullYear() === currentYear &&
           s.sector === userSector;
  });

  const totalHoursThisMonth = thisMonthSupervisions.reduce((sum, s) => sum + s.hours, 0);
  const currentHours = calculateHours(supervisionForm.startTime, supervisionForm.endTime);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-lg text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">ATs do Setor</p>
              <p className="text-2xl font-bold text-purple-700">{sectorATs.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Supervisões</p>
              <p className="text-2xl font-bold text-purple-700">{thisMonthSupervisions.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-teal-100 rounded-lg">
              <Clock className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Horas do Mês</p>
              <p className="text-2xl font-bold text-purple-700">{totalHoursThisMonth.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Setor</p>
              <p className="text-2xl font-bold text-purple-700">{userSector?.toUpperCase()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lançar Supervisão */}
      <Card>
        <CardHeader>
          <CardTitle>Lançar Supervisão</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Acompanhante Terapêutico
                </label>
                <Select
                  name="atId"
                  value={supervisionForm.atId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Selecione o AT</option>
                  {sectorATs.map(at => (
                    <option key={at.id} value={at.id}>
                      {at.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Data
                </label>
                <Input
                  type="date"
                  name="date"
                  value={supervisionForm.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Hora Início
                </label>
                <Input
                  type="time"
                  name="startTime"
                  value={supervisionForm.startTime}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Hora Fim
                </label>
                <Input
                  type="time"
                  name="endTime"
                  value={supervisionForm.endTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-purple-800 mb-2">
                Observações
              </label>
              <textarea
                name="observations"
                value={supervisionForm.observations}
                onChange={handleInputChange}
                rows={3}
                placeholder="Observações sobre a supervisão..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200 bg-white/90"
              />
            </div>

            {currentHours > 0 && (
              <div className="bg-teal-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-teal-600" />
                  <span className="font-semibold text-teal-800">
                    Duração da Supervisão: {formatHours(currentHours)}
                  </span>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full">
              Lançar Supervisão
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Histórico de Supervisões */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Supervisões - {userSector?.toUpperCase()}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>AT</TableHeadCell>
                <TableHeadCell>Data</TableHeadCell>
                <TableHeadCell>Início</TableHeadCell>
                <TableHeadCell>Fim</TableHeadCell>
                <TableHeadCell>Horas</TableHeadCell>
                <TableHeadCell>Setor</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thisMonthSupervisions.map(supervision => {
                const at = sectorATs.find(a => a.id === supervision.at_id);
                return (
                  <TableRow key={supervision.id}>
                    <TableCell className="font-medium">{at?.name || 'N/A'}</TableCell>
                    <TableCell>{formatDateBR(supervision.date)}</TableCell>
                    <TableCell>{supervision.start_time}</TableCell>
                    <TableCell>{supervision.end_time}</TableCell>
                    <TableCell>{formatHours(supervision.hours)}</TableCell>
                    <TableCell>{supervision.sector.toUpperCase()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {thisMonthSupervisions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhuma supervisão registrada para este mês.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo por AT */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por AT</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>AT</TableHeadCell>
                <TableHeadCell>Supervisões do Mês</TableHeadCell>
                <TableHeadCell>Total de Horas</TableHeadCell>
                <TableHeadCell>Média por Supervisão</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectorATs.map(at => {
                const atSupervisions = thisMonthSupervisions.filter(s => s.at_id === at.id);
                const totalHours = atSupervisions.reduce((sum, s) => sum + s.hours, 0);
                const avgHours = atSupervisions.length > 0 ? totalHours / atSupervisions.length : 0;
                
                return (
                  <TableRow key={at.id}>
                    <TableCell className="font-medium">{at.name}</TableCell>
                    <TableCell>{atSupervisions.length}</TableCell>
                    <TableCell>{formatHours(totalHours)}</TableCell>
                    <TableCell>{formatHours(avgHours)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Footer />
    </div>
  );
};