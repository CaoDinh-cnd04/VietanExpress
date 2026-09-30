/** Tiếng Anh — nhóm hàng hóa (dbo.NhomHangHoa) và shipper gốc của forwarder. */
export const categories: Record<string, string> = {
  // Quản lý nhóm hàng
  'Thêm / sửa nhóm hàng': 'Add / edit categories',
  'Quản lý nhóm hàng hóa': 'Manage goods categories',
  'Tên nhóm mới': 'New category name',
  'Tên nhóm mới, vd: Áo dài, nón lá…': 'New category name, e.g. Ao dai, conical hats…',
  'Thêm nhóm': 'Add category',
  'Không tải được danh sách nhóm hàng': 'Could not load categories',
  'Nhóm của bạn ({n})': 'Your categories ({n})',
  'Chưa có nhóm riêng — thêm nhóm ở ô phía trên.': 'No categories of your own yet — add one above.',
  'Nhóm chung của Việt An ({n})': 'Viet An standard categories ({n})',
  'Đánh dấu yêu thích': 'Mark as favourite',
  'Đánh dấu yêu thích — nhóm hiện lên đầu danh sách': 'Mark as favourite — shown at the top of the list',
  'Bỏ yêu thích': 'Remove favourite',
  'Tên nhóm {name}': 'Name of category {name}',
  'Sửa nhóm {name}': 'Edit category {name}',
  'Xóa nhóm {name}': 'Delete category {name}',
  'Xóa nhóm "{name}"? Đơn đã khai nhóm này không bị ảnh hưởng.': 'Delete category "{name}"? Orders already using it are not affected.',

  // Thông báo từ máy chủ
  'Đã thêm nhóm hàng': 'Category added',
  'Đã cập nhật nhóm hàng': 'Category updated',
  'Đã xóa nhóm hàng': 'Category deleted',
  'Nhập tên nhóm hàng': 'Enter a category name',
  'Tên nhóm tối đa {n} ký tự': 'Category name must be at most {n} characters',
  'Đã có nhóm hàng "{name}"': 'Category "{name}" already exists',
  'Không tìm thấy nhóm hàng (nhóm chung của Việt An không sửa / xóa được)': 'Category not found (Viet An standard categories cannot be edited or deleted)',

  // Nhóm chung Việt An (dữ liệu mặc định trong dbo.NhomHangHoa)
  'Quần áo, giày dép': 'Clothing & footwear',
  'Túi xách, phụ kiện thời trang': 'Bags & fashion accessories',
  'Trang sức, đồng hồ': 'Jewellery & watches',
  'Mỹ phẩm, hóa mỹ phẩm': 'Cosmetics & toiletries',
  'Thực phẩm khô, đặc sản': 'Dried food & specialties',
  'Thực phẩm chức năng': 'Dietary supplements',
  'Thuốc, dược phẩm': 'Medicine & pharmaceuticals',
  'Đồ điện tử': 'Electronics',
  'Linh kiện, phụ tùng máy móc': 'Machine parts & components',
  'Hàng có pin': 'Goods with batteries',
  'Chất lỏng, dầu, nước hoa': 'Liquids, oils & perfume',
  'Sách, văn phòng phẩm': 'Books & stationery',
  'Đồ gia dụng, nhà bếp': 'Household & kitchenware',
  'Đồ chơi': 'Toys',
  'Hàng thủ công mỹ nghệ': 'Handicrafts',
  'Vải, nguyên phụ liệu may': 'Fabric & sewing materials',
  'Hàng mẫu (sample)': 'Samples',
  'Quà tặng cá nhân': 'Personal gifts',

  // Shipper gốc (forwarder)
  'Tên shipper gốc': 'Original shipper name',
  'Dành cho đơn vị forwarder gửi hộ khách — không bắt buộc': 'For forwarders shipping on behalf of a customer — optional',
  'Shipper gốc': 'Original shipper'
};
