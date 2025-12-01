import { Request, Response } from 'express';
import axios from 'axios';

const EDUCATOR_API_URL = process.env.EDUCATOR_API_URL || 'http://localhost:8001';

export const askEducator = async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    const response = await axios.post(`${EDUCATOR_API_URL}/ask`, { question });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error: any) {
    console.error('Educator API error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get response from educator',
      error: error.message
    });
  }
};

export const getTopics = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${EDUCATOR_API_URL}/topics`);
    res.json({ success: true, data: response.data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFAQ = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${EDUCATOR_API_URL}/faq`);
    res.json({ success: true, data: response.data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearHistory = async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${EDUCATOR_API_URL}/clear`);
    res.json({ success: true, data: response.data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
