import axios from 'axios';

// A URL base da API é lida da variável de ambiente VITE_API_BASE_URL.
// O Vite substitui import.meta.env.VITE_API_BASE_URL pelo valor correto durante o build.
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${baseURL}/api`,
});
