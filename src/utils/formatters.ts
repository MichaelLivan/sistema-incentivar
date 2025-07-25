/**
 * ✅ FUNÇÃO PRINCIPAL CORRIGIDA: Calcula horas entre dois horários com máxima precisão
 * @param startTime - Horário inicial "HH:MM"
 * @param endTime - Horário final "HH:MM"
 * @returns Horas decimais precisas (ex: 1.5 para 1h30min)
 */
export const calculateHours = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) {
    console.warn('⚠️ calculateHours: Horários inválidos', { startTime, endTime });
    return 0;
  }
  
  // Validar formato básico
  if (!startTime.includes(':') || !endTime.includes(':')) {
    console.warn('⚠️ calculateHours: Formato inválido', { startTime, endTime });
    return 0;
  }
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  // Verificar se os valores são válidos
  if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
    console.warn('⚠️ calculateHours: Números inválidos', { startHour, startMin, endHour, endMin });
    return 0;
  }
  
  if (startMin >= 60 || endMin >= 60 || startMin < 0 || endMin < 0) {
    console.warn('⚠️ calculateHours: Minutos inválidos', { startMin, endMin });
    return 0;
  }
  
  if (startHour < 0 || endHour < 0 || startHour >= 24 || endHour >= 24) {
    console.warn('⚠️ calculateHours: Horas inválidas', { startHour, endHour });
    return 0;
  }
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  // Permitir horários que passam da meia-noite (ex: 23:00 às 01:00)
  let diffMinutes = endMinutes - startMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Adicionar 24 horas em minutos
    console.log('🌙 calculateHours: Horário overnight detectado', { startTime, endTime, diffMinutes });
  }
  
  // ✅ CORREÇÃO PRINCIPAL: Retornar sempre valor preciso em decimais
  const hours = diffMinutes / 60;
  
  console.log('⏱️ calculateHours:', { 
    startTime, 
    endTime, 
    diffMinutes, 
    hours: hours.toFixed(4) 
  });
  
  return Math.max(0, hours);
};

/**
 * ✅ FUNÇÃO CORRIGIDA: Soma segura de arrays de horas evitando problemas de ponto flutuante
 * @param hoursArray - Array de horas em formato decimal
 * @returns Soma total em horas decimais
 */
export const sumHoursSafely = (hoursArray: (number | string)[]): number => {
  if (!Array.isArray(hoursArray) || hoursArray.length === 0) {
    return 0;
  }
  
  // Converter tudo para minutos primeiro para evitar problemas de ponto flutuante
  const totalMinutes = hoursArray.reduce((sum, hours) => {
    const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
    const validHours = (isNaN(numHours) || numHours === null || numHours === undefined) ? 0 : numHours;
    return sum + Math.round(validHours * 60);
  }, 0);
  
  const result = totalMinutes / 60;
  
  console.log('🧮 sumHoursSafely:', { 
    input: hoursArray, 
    totalMinutes, 
    result: result.toFixed(4) 
  });
  
  return result;
};

/**
 * ✅ FUNÇÃO CORRIGIDA: Soma horas de sessões de forma segura
 * @param sessions - Array de sessões com start_time, end_time ou hours
 * @returns Total de horas somadas com precisão
 */
export const sumSessionHours = (sessions: any[]): number => {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return 0;
  }
  
  const totalMinutes = sessions.reduce((sum, session) => {
    // Preferir cálculo real pelos horários se disponível
    if (session.start_time && session.end_time) {
      const calculatedHours = calculateHours(session.start_time, session.end_time);
      return sum + Math.round(calculatedHours * 60);
    }
    
    // Caso contrário, usar o campo hours se disponível
    if (session.hours !== undefined && session.hours !== null) {
      const sessionHours = typeof session.hours === 'string' ? parseFloat(session.hours) : session.hours;
      const validHours = isNaN(sessionHours) ? 0 : sessionHours;
      return sum + Math.round(validHours * 60);
    }
    
    return sum;
  }, 0);
  
  const result = totalMinutes / 60;
  
  console.log('📊 sumSessionHours:', { 
    sessionsCount: sessions.length, 
    totalMinutes, 
    result: result.toFixed(4) 
  });
  
  return result;
};

/**
 * ✅ FUNÇÃO MELHORADA: Formata horas decimais para formato HH:MM com precisão
 * @param hours - Horas em formato decimal (ex: 1.5)
 * @returns String no formato "01:30" 
 */
export const formatHours = (hours: number | string): string => {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  
  if (isNaN(numHours) || numHours === null || numHours === undefined) {
    return '00:00';
  }
  
  // ✅ CORREÇÃO: Converter para minutos primeiro para evitar problemas de ponto flutuante
  const totalMinutes = Math.round(Math.abs(numHours) * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  const result = `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  // Log apenas para valores significativos (debug)
  if (numHours > 0) {
    console.log('🕒 formatHours:', { input: numHours, totalMinutes, wholeHours, minutes, result });
  }
  
  return result;
};

/**
 * ✅ FUNÇÃO NOVA: Valida se um cálculo de horas está correto
 * @param startTime - Horário inicial
 * @param endTime - Horário final
 * @param expectedHours - Horas esperadas
 * @returns true se o cálculo está correto
 */
export const validateHoursCalculation = (startTime: string, endTime: string, expectedHours: number): boolean => {
  const calculatedHours = calculateHours(startTime, endTime);
  const tolerance = 0.01; // 1 minuto de tolerância
  
  const isValid = Math.abs(calculatedHours - expectedHours) <= tolerance;
  
  if (!isValid) {
    console.warn('⚠️ validateHoursCalculation: Diferença detectada', {
      startTime,
      endTime,
      expectedHours,
      calculatedHours,
      difference: Math.abs(calculatedHours - expectedHours)
    });
  }
  
  return isValid;
};

/**
 * ✅ FUNÇÃO MELHORADA: Formata horas para exibição precisa
 * @param hours - Horas em formato decimal
 * @returns String formatada "1h45min", "2h", "45min" ou "0h"
 */
export const formatPreciseHours = (hours: number | string): string => {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  
  if (!numHours || numHours === 0 || isNaN(numHours)) return '0h';
  
  // ✅ CORREÇÃO: Usar totalMinutes para evitar problemas de arredondamento
  const totalMinutes = Math.round(Math.abs(numHours) * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  } else if (wholeHours === 0) {
    return `${minutes}min`;
  } else {
    return `${wholeHours}h${minutes}min`;
  }
};

/**
 * ✅ FUNÇÃO NOVA: Formata data para padrão brasileiro
 * @param dateString - Data no formato "YYYY-MM-DD"
 * @returns String no formato "DD/MM/YYYY"
 */
export const formatDateBR = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    console.warn('⚠️ formatDateBR: Data inválida', { dateString, error });
    return dateString;
  }
};

/**
 * ✅ FUNÇÃO AUXILIAR: Converte horas decimais para input time
 * @param hours - Horas em formato decimal (ex: 1.5)
 * @returns String no formato "HH:MM" para input time
 */
export const hoursToTimeInput = (hours: number | string): string => {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  
  if (isNaN(numHours) || numHours === null || numHours === undefined) {
    return '00:00';
  }
  
  const totalMinutes = Math.round(Math.abs(numHours) * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * ✅ FUNÇÃO AUXILIAR: Converte input time para horas decimais
 * @param timeString - Horário no formato "HH:MM"
 * @returns Horas em formato decimal
 */
export const parseTimeToHours = (timeString: string): number => {
  if (!timeString || !timeString.includes(':')) return 0;
  
  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  
  return hours + (minutes / 60);
};

/**
 * ✅ FUNÇÃO AUXILIAR: Formatar moeda brasileira
 * @param value - Valor numérico
 * @returns String formatada "R$ 1.234,56"
 */
export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue) || numValue === null || numValue === undefined) {
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue);
};

/**
 * ✅ FUNÇÃO AUXILIAR: Converter valor para número seguro
 * @param value - Qualquer valor
 * @returns Número válido ou 0
 */
export const safeNumber = (value: any): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * ✅ FUNÇÃO AUXILIAR: Converter minutos para horas decimais
 * @param minutes - Minutos totais
 * @returns Horas em formato decimal
 */
export const minutesToHours = (minutes: number): number => {
  if (isNaN(minutes) || minutes < 0) return 0;
  return minutes / 60;
};

/**
 * ✅ FUNÇÃO AUXILIAR: Converter horas decimais para minutos
 * @param hours - Horas em formato decimal
 * @returns Minutos totais
 */
export const hoursToMinutes = (hours: number | string): number => {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  if (isNaN(numHours) || numHours < 0) return 0;
  return Math.round(numHours * 60);
};

/**
 * ✅ FUNÇÃO AUXILIAR: Verificar se um horário é válido
 * @param timeString - Horário no formato "HH:MM"
 * @returns true se o horário é válido
 */
export const isValidTime = (timeString: string): boolean => {
  if (!timeString || !timeString.includes(':')) return false;
  
  const [hours, minutes] = timeString.split(':').map(Number);
  
  return !isNaN(hours) && 
         !isNaN(minutes) && 
         hours >= 0 && 
         hours < 24 && 
         minutes >= 0 && 
         minutes < 60;
};

/**
 * ✅ FUNÇÃO AUXILIAR: Arredondar horas para múltiplos de 15 minutos
 * @param hours - Horas em formato decimal
 * @returns Horas arredondadas para o múltiplo de 0.25 mais próximo
 */
export const roundToQuarterHour = (hours: number | string): number => {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  if (isNaN(numHours)) return 0;
  
  return Math.round(numHours * 4) / 4;
};

/**
 * ✅ FUNÇÃO AUXILIAR: Arredondar horas para múltiplos de 30 minutos
 * @param hours - Horas em formato decimal
 * @returns Horas arredondadas para o múltiplo de 0.5 mais próximo
 */
export const roundToHalfHour = (hours: number | string): number => {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  if (isNaN(numHours)) return 0;
  
  return Math.round(numHours * 2) / 2;
};