export type SearchDto = {
  itemList: {
    status: number;
    reason: string;
    total_value: number;
    item: {
      cate_cd_1: string;
      cate_cd_2: string;
      cate_cd_3: string;
      cate_cd_4: string;
      cate_cd_5: string;
      cate_nm_1: string;
      cate_nm_2: string;
      cate_nm_3: string;
      cate_nm_4: string;
      cate_nm_5: string;
      is_moc: number;
      item_id: string;
      item_number: string;
      level_rate: string;
      point: string;
      title: string;
      wrong_rate: string;
      year: string;
    }[];
  };
};
