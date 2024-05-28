import { Request, Response } from 'express';
import { sequelize } from '../config/sequelize';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import dayjs from 'dayjs';

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

// FUNCTION TO FETCH BOARD COLUMNS
const fetchBoardColumns = async (boardId: string) => {
  const query = `
    query {
      boards(ids: ${boardId}) {
        columns {
          id
          title
        }
      }
    }
  `;
  const response: AxiosResponse<any, any> = await mondayApiToken.post('', { query });
  return response.data.data.boards[0].columns;
};

// EXAMPLE FUNCTION TO GET COLUMN IDS BY TITLE
const getColumnIdByTitle = (columns: any[], title: string): string | undefined => {
  const column = columns.find(col => col.title === title);
  return column ? column.id : undefined;
};

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

    // FETCH BOARD COLUMNS
    const columns = await fetchBoardColumns(process.env.BOARD_ID_FRAGRANCES!);
    const createdAtColumnId: string | undefined = getColumnIdByTitle(columns, 'Created At');
    const updatedAtColumnId: string | undefined = getColumnIdByTitle(columns, 'Updated At');

    console.log(columns);


    // SEND MUTATION QUERY TO MONDAY API TO CHANGE CREATED_AT / UPDATED_AT
    const mutation: string = `
      mutation {
        change_multiple_column_values(item_id: ${ id },
          board_id: ${process.env.BOARD_ID_FRAGRANCES},
          column_values: "${JSON.stringify({
            text1__1: dayjs(created_at).format('MMMM D, YYYY'),
            text2__1: dayjs(updated_at).format('MMMM D, YYYY')
          }).replace(/"/g, '\\"')}"
          ) {
          id
        }
      }
    `;

    // VERIFY MONDAY.COM API TOKEN
    if (apiToken) {
      const mondayResponse: AxiosResponse<any, any> = await mondayApiToken.post('', { query: mutation });
      console.log("Success! Monday API Response: ", mondayResponse.data);
    }

    res.status(200).send({ message: 'Fragrance added successfully.' });

  } catch (error: any) {
    // res.status(500).send(error);
    res.status(500).send(error);
    // console.error(error);
    console.error('silent error');
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

    // EXECUTE STORED PROCEDURE WITH UPDATED VALUES
    await sequelize.query('EXECUTE UpdateFragrance :id, :name, :description, :category, :updated_at, :image_url', {
      replacements: { id, name, description, category, updated_at, image_url },
    });

    // FETCH BOARD COLUMNS
    const columns = await fetchBoardColumns(process.env.BOARD_ID_FRAGRANCES!);
    const updatedAtColumnId = getColumnIdByTitle(columns, 'Updated At');

    // SEND MUTATION QUERY TO MONDAY API TO CHANGE UPDATED_AT
    const mutation: string = `
    mutation {
      change_column_value(item_id: ${id}, board_id: ${process.env.BOARD_ID_FRAGRANCES}, column_id: "${updatedAtColumnId}", value: "${dayjs(updated_at).format('MMMM D, YYYY')}") {
        id
      }
    }
    `;

    // VERIFY MONDAY.COM API TOKEN
    if (apiToken) {
      const mondayResponse: AxiosResponse<any, any> = await mondayApiToken.post('', { query: mutation });
      console.log("Success! Monday API Response: ", mondayResponse.data);
    }

    res.status(200).send({ message: 'Fragrance updated successfully.' });

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

    res.json(`Fragrance ${id} deleted successfully`);
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};
