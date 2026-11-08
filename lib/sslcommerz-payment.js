import Order from '@/models/Order';
import { validateSslCommerzTransaction } from '@/lib/sslcommerz';

const isValidStatus = (status) => status === 'VALID' || status === 'VALIDATED';

export async function processSslCommerzPayment(formData, requestUrl) {
  const transactionId = String(formData.get('tran_id') || '');
  const validationId = String(formData.get('val_id') || '');
  if (!/^[a-zA-Z0-9-]{1,40}$/.test(transactionId) || !/^[a-zA-Z0-9-]{1,100}$/.test(validationId)) {
    return { status: 'unverified', order: null };
  }

  const order = await Order.findOne({ orderNumber: transactionId });
  if (!order || order.paymentMethod !== 'SSLCOMMERZ') {
    return { status: 'unverified', order: null };
  }
  if (order.paymentStatus === 'paid') return { status: 'paid', order };

  const validation = await validateSslCommerzTransaction(validationId, requestUrl);
  if (!isValidStatus(validation.status)) return { status: 'unverified', order };

  const amountMatches = Number(validation.amount).toFixed(2) === Number(order.total).toFixed(2);
  const transactionMatches = validation.tran_id === order.orderNumber;
  const currencyMatches = validation.currency === 'BDT';
  const needsReview = !amountMatches || !transactionMatches || !currencyMatches ||
    String(validation.risk_level) === '1' || order.status === 'Cancelled';

  const validTransitionFilter = {
    _id: order._id,
    paymentMethod: 'SSLCOMMERZ',
    paymentStatus: { $in: ['pending', 'review'] },
    ...(needsReview ? {} : { status: { $ne: 'Cancelled' } }),
  };
  await Order.updateOne(validTransitionFilter, {
    $set: {
      paymentStatus: needsReview ? 'review' : 'paid',
      paymentValidationId: validationId,
      ...(needsReview ? {} : { paidAt: new Date() }),
    },
  });
  let updatedOrder = await Order.findById(order._id);
  if (updatedOrder?.status === 'Cancelled' && updatedOrder.paymentStatus !== 'paid') {
    await Order.updateOne(
      { _id: order._id, paymentMethod: 'SSLCOMMERZ', paymentStatus: { $in: ['pending', 'review'] } },
      { $set: { paymentStatus: 'review', paymentValidationId: validationId } },
    );
    updatedOrder = await Order.findById(order._id);
  }
  return { status: updatedOrder?.paymentStatus || 'unverified', order: updatedOrder };
}
