const servers = await prisma.server.findMany();
servers.map((server) => {
  prisma.server
    .update({
      where: { id: server.id },
      data: { uniqueName: `${server.name} - ${server.region}` },
    })
    .catch((err) => console.log(err));
});
