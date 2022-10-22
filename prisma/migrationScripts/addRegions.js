prisma.server
  .update({
    where: { name: server.name },
    data: { region: server.region },
  })
  .catch((err) => console.log(err));
