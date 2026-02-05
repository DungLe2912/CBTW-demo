import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    one_time_1000_requests: {
      executor: "constant-arrival-rate",
      rate: 400, //  request/s
      timeUnit: "1s",
      duration: "1s",
      preAllocatedVUs: 200,
      maxVUs: 1000,
    },
  },
};

export default function () {
  const url = "http://localhost:4000/orders";

  const payload = JSON.stringify({
    customerId: 1,
    items: [
      {
        productId: 1,
        quantity: 1,
        price: 1000,
      },
    ],
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
  });
}
