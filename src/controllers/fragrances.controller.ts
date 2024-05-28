import { Request, Response } from 'express';
import { sequelize } from '../config/sequelize';
import axios, { AxiosInstance } from 'axios';

// LOAD API TOKEN FROM ENVIRONMENT VARIABLES
const apiToken: string | undefined = process.env.MONDAY_API_TOKEN;
const processedItems = new Set();

// SET UP AXIOS INSTANCE FOR MONDAY.COM API
const mondayApiToken: AxiosInstance = axios.create({
  baseURL: 'https://api.monday.com/v2',
  headers: {
    Authorization: apiToken,
    'Content-Type': 'application/json',
  },
});

export const selectAllFragrances = async (req: Request, res: Response): Promise<void> => {
  // SELECT ALL FRAGRANCES
  try {
    const selectAll = await sequelize.query('EXECUTE GetAllFragrances');
    res.send(selectAll[0]);
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const addFragrance = async (req: Request, res: Response): Promise<void> => {
  // ADD NEW FRAGRANCE
  try {
    const { pulseId, pulseName } = req.body.event;

    // CHECK IF ITEM HAS ALREADY BEEN PROCESSED
    if (processedItems.has(pulseId)) {
      console.log(`Item ${pulseId} already processed.`);
      res.status(200).send({ message: 'Item already processed.' });
      return;
    }

    // MARK ITEM AS PROCESSED
    processedItems.add(pulseId);

    const id = pulseId;
    const name = pulseName;

    // SET CREATED AND UPDATED DATES
    const created_at: string = new Date().toISOString();
    const updated_at: string = new Date().toISOString();

    // EXECUTE STORED PROCEDURE TO ADD FRAGRANCE
    await sequelize.query('EXECUTE AddFragrance :id, :name, :created_at, :updated_at', {
      replacements: { id, name, created_at, updated_at },
    });

    // SEND MUTATION QUERY TO MONDAY API TO CHANGE CREATED_AT / UPDATED_AT
    // ...

    res.status(200).send({ message: 'Fragrance added successfully.' });

  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const updateFragrance = async (req: Request, res: Response): Promise<void> => {
  // UPDATE FRAGRANCE
  try {
    // DESTRUCTURE DATA FROM MONDAY.COM UPDATE EVENT
    const { pulseId, pulseName, columnTitle, value } = req.body.event;

    // DECLARE VARIABLES TO CAPTURE DATA FROM PAYLOAD
    const id: number = pulseId;
    let name: string | null = null;
    let description: string | null = null;
    let updated_at: string | null = new Date().toISOString();
    let category: string | null = null;
    let image_url: string | null = null;

    // UPDATE IDENTIFIED COLUMN
    switch (columnTitle) {
      case 'Name':
        name = pulseName;
        break;
      case 'Description':
        description = value.value;
        break;
      case 'Category':
        category = value.label.text;
        break;
      case 'Image URL':
        image_url = value.value;
        break;
      default:
        res.status(400).send('Unknown column ID');
        return;
    }

    // SEND MUTATION QUERY TO MONDAY API TO CHANGE UPDATED_AT
    // ...

    // EXECUTE STORED PROCEDURE WITH UPDATED VALUES
    const response: void = await sequelize.query('EXECUTE UpdateFragrance :id, :name, :description, :category, :updated_at, :image_url', {
      replacements: { id, name, description, category, updated_at, image_url },
    })
      .then((response: any): void => {
        // SEND RESPONSE
        res.json(`Fragrance ${ id } created successfully. Response from server: ${ response }`)
        return;
      })
      .catch((error: any): void => console.error(error));
    return;
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const deleteFragrance = async (req: Request, res: Response): Promise<void> => {
  // DELETE FRAGRANCE
  try {
    const { itemId } = req.body.event;
    let id: number;

    if (itemId) {
      id = itemId;
    } else id = req.body.id;

    // EXECUTE STORED PROCEDURE TO DELETE FRAGRANCE
    await sequelize.query('EXECUTE DeleteFragrance :id', {
      replacements: { id },
    });

    res.json(`Fragrance ${ id } deleted successfully`);
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};
