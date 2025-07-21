// Utilitários para formatação de dados - VERSÃO MELHORADA

/**
 * Formata horas decimais para formato HH:MM
 * @param hours - Horas em formato decimal (ex: 1.5)
 * @returns String no formato "01:30" 
 */
export const formatHours = (hours: number): string => {
  if (isNaN(hours) || hours === null || hours === undefined) {
    return '00:00';
  }
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Formata horas para exibição precisa sem arredondamentos
 * @param hours - Horas em formato decimal
 * @returns String formatada "1h45min", "2h", "45min" ou "0h"
 */
export const formatPreciseHours = (hours: number): string => {
  if (!hours || hours === 0 || isNaN(hours)) return '0h';
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  } else if (wholeHours === 0) {
    return `${minutes}min`;
  } else {
    return `${wholeHours}h${minutes}min`;
  }
};

/**
 * Formata horas para exibição simples (apenas com "h") - MELHORADA
 * @param hours - Horas em formato decimal
 * @returns String formatada com "h" no final, sem arredondamentos desnecessários
 */
export const formatHoursSimple = (hours: number): string => {
  if (isNaN(hours) || hours === null || hours === undefined) {
    return '0h';
  }
  
  // Se for número inteiro, mostrar sem decimais
  if (hours % 1 === 0) {
    return `${hours}h`;
  }
  
  // Se tem decimais, usar formatação precisa
  return formatPreciseHours(hours);
};

/**
 * Converte formato H:MM ou HH:MM para horas decimais
 * @param timeString - String no formato "6:45" ou "06:45"
 * @returns Número decimal (ex: 6.75)
 */
export const parseTimeInputToDecimal = (timeString: string): number => {
  if (!timeString || timeString === '') return 0;
  
  const cleaned = timeString.trim();
  
  if (cleaned.includes(':')) {
    const [hoursStr, minutesStr] = cleaned.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    if (isNaN(hours) || isNaN(minutes)) return 0;
    if (minutes >= 60) return 0;
    if (hours < 0 || minutes < 0) return 0;
    
    return hours + (minutes / 60);
  }
  
  const numValue = Number(cleaned);
  return isNaN(numValue) ? 0 : numValue;
};

/**
 * Converte horas decimais para formato H:MM para inputs
 * @param hours - Horas em formato decimal
 * @returns String no formato "6:45"
 */
export const formatDecimalToTimeInput = (hours: number): string => {
  if (!hours || hours === 0 || isNaN(hours)) return '';
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Converte formato HH:MM para decimal (para inputs de time do HTML)
 * @param timeString - String no formato "HH:MM"
 * @returns Número decimal (ex: 1.5)
 */
export const parseTimeToHours = (timeString: string): number => {
  if (!timeString) return 0;
  
  const timeParts = timeString.split(':');
  if (timeParts.length !== 2) return 0;
  
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes) || minutes >= 60) return 0;
  
  return hours + (minutes / 60);
};

/**
 * Converte horas decimais para formato HH:MM para inputs de time HTML
 * @param hours - Horas em formato decimal
 * @returns String no formato "HH:MM"
 */
export const hoursToTimeInput = (hours: number): string => {
  if (!hours || hours === 0) return '00:00';
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Formata data sem problemas de timezone
 * @param dateString - Data no formato YYYY-MM-DD
 * @returns String formatada DD/MM/YYYY
 */
export const formatDateBR = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
};

/**
 * Formata valores monetários para exibição
 * @param value - Valor numérico
 * @returns String formatada "R$ 1.234,56"
 */
export const formatCurrency = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) {
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Formata valores monetários simples (sem símbolo)
 * @param value - Valor numérico
 * @returns String formatada "1.234,56"
 */
export const formatCurrencySimple = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) {
    return '0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Função para garantir valores numéricos válidos - MELHORADA
 * @param value - Qualquer valor
 * @returns Número válido ou 0
 */
export const safeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

/**
 * Calcula horas entre dois horários - VERSÃO PRECISA
 * @param startTime - Horário inicial "HH:MM"
 * @param endTime - Horário final "HH:MM"
 * @returns Horas decimais precisas
 */
export const calculateHours = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  // Verificar se os valores são válidos
  if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) return 0;
  if (startMin >= 60 || endMin >= 60) return 0;
  if (startHour < 0 || startMin < 0 || endHour < 0 || endMin < 0) return 0;
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  // Permitir horários que passam da meia-noite (ex: 23:00 às 01:00)
  let diffMinutes = endMinutes - startMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Adicionar 24 horas
  }
  
  return Math.max(0, diffMinutes / 60);
};

/**
 * Formata duração em minutos para formato legível
 * @param totalMinutes - Total de minutos
 * @returns String formatada "2h30min", "1h", "45min"
 */
export const formatMinutesToReadable = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes === 0 || isNaN(totalMinutes)) return '0min';
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h${minutes}min`;
  }
};

/**
 * Valida se um horário está no formato HH:MM válido
 * @param timeString - String do horário
 * @returns true se válido, false se inválido
 */
export const isValidTimeFormat = (timeString: string): boolean => {
  if (!timeString) return false;
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

/**
 * Adiciona horas a um horário específico
 * @param baseTime - Horário base "HH:MM"
 * @param hoursToAdd - Horas decimais para adicionar
 * @returns Novo horário "HH:MM"
 */
export const addHoursToTime = (baseTime: string, hoursToAdd: number): string => {
  if (!baseTime || !isValidTimeFormat(baseTime) || !hoursToAdd) return baseTime;
  
  const [hours, minutes] = baseTime.split(':').map(Number);
  const totalMinutes = (hours * 60) + minutes + Math.round(hoursToAdd * 60);
  
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
};