import { Request, Response } from 'express';
import { sequelize } from '../config/sequelize';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import dayjs from 'dayjs';

const apiToken: string | undefined = process.env.MONDAY_API_TOKEN;

const mondayApiToken: AxiosInstance = axios.create({
  baseURL: 'https://api.monday.com/v2',
  headers: {
    Authorization: apiToken,
    'Content-Type': 'application/json',
  },
});

export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  // SELECT ALL ORDERS
  try {
    const selectAll = await sequelize.query('EXECUTE GetAllOrders');
    res.send(selectAll[0]);
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  // CREATE NEW ORDER
  try {
    const {
      first_name,
      last_name,
      number_of_kits,
      fragrance1_id,
      fragrance2_id,
      fragrance3_id,
      status,
    } = req.body;

    // ASSIGN INPUT VALUES FOR NEW ORDER
    const created_at: string = new Date().toISOString();
    const updated_at: string = new Date().toISOString();
    const numberOfKits: number = parseInt(number_of_kits, 10);
    const fragrance1Id: bigint = fragrance1_id;
    const fragrance2Id: bigint = fragrance2_id;
    const fragrance3Id: bigint = fragrance3_id;

    // LEVERAGE ORM TO SAVE NEW ORDER TO DATABASE
    const response: any = await sequelize.query(
      'EXECUTE CreateOrder :first_name, :last_name, :number_of_kits, :fragrance1_id, :fragrance2_id, :fragrance3_id',
      {
        replacements: {
          first_name,
          last_name,
          number_of_kits: numberOfKits,
          fragrance1_id: fragrance1Id,
          fragrance2_id: fragrance2Id,
          fragrance3_id: fragrance3Id,
          created_at: created_at,
          updated_at: updated_at
        }
      }
    );

    // DATABASE OUTPUTS NEW ORDER ID
    const orderId: number = response[0][0].NewOrderID;

    // MUTATION QUERY STRING FOR MONDAY.COM API
    const mutation: string = `
      mutation {
        create_item (
          board_id: ${process.env.BOARD_ID_ORDERS},
          item_name: "${orderId}",
          column_values: "${JSON.stringify({
            first_name__1: first_name,
            text__1: last_name,
            status7__1: status,
            quantity__1: numberOfKits,
            fragrance_1_id1__1: 'fragrance1Id', // ADD FRAGRANCE NAME HERE
            numbers__1: 'fragrance2Id', // ADD FRAGRANCE NAME HERE
            fragrance_3_id__1: 'fragrance3Id', // ADD FRAGRANCE NAME HERE
            text34__1: dayjs(created_at).format('MMMM D, YYYY'),
            text4__1: dayjs(updated_at).format('MMMM D, YYYY')
          }).replace(/"/g, '\\"')}"
        ) {
          id
          name
        }
      }`;

    // VERIFY MONDAY.COM API TOKEN
    if (apiToken) {
      const mondayResponse: AxiosResponse<any, any> = await mondayApiToken.post('', { query: mutation });
      console.log("Success! Monday API Response: ", mondayResponse.data);
    }

    // SEND NEW ORDER ID
    res.json({ orderId });
  } catch (error) {
    res.status(500).send(error);
    console.error(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  // UPDATE ORDER STATUS
  try {
    const status = req.body.event.value.label.text;
    const id = req.body.event.pulseName;

    // LEVERAGE ORM TO UPDATE RECORD IN DATABASE
    await sequelize.query('EXECUTE UpdateOrderStatus :id, :status', {
      replacements: { id, status }
    });

    // SEND SUCCESS RESPONSE
    res.status(200).send('Order status updated successfully');
  } catch (error: any) {
    res.status(500).send(error);
    console.error(error);
  }
};